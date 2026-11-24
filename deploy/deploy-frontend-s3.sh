#!/usr/bin/env bash
# Builds the React app and syncs it to an S3 bucket fronted by CloudFront.
# Requires: AWS CLI configured (aws configure) with permissions for S3 + CloudFront.
#
# Usage:
#   VITE_API_BASE_URL=https://api.yourdomain.com/api \
#   S3_BUCKET=agrolink-frontend \
#   CLOUDFRONT_DISTRIBUTION_ID=E1234567890 \
#   ./deploy/deploy-frontend-s3.sh
set -euo pipefail

: "${S3_BUCKET:?Set S3_BUCKET to your target bucket name}"
: "${VITE_API_BASE_URL:?Set VITE_API_BASE_URL to your backend API URL}"

echo "== Installing dependencies =="
npm ci

echo "== Building production bundle =="
VITE_API_BASE_URL="$VITE_API_BASE_URL" npm run build

echo "== Syncing dist/ to s3://$S3_BUCKET =="
aws s3 sync dist/ "s3://$S3_BUCKET" --delete \
  --cache-control "public, max-age=31536000, immutable" \
  --exclude "index.html"

# index.html should never be cached long-term so deploys go live immediately
aws s3 cp dist/index.html "s3://$S3_BUCKET/index.html" \
  --cache-control "public, max-age=0, must-revalidate"

if [ -n "${CLOUDFRONT_DISTRIBUTION_ID:-}" ]; then
  echo "== Invalidating CloudFront cache =="
  aws cloudfront create-invalidation \
    --distribution-id "$CLOUDFRONT_DISTRIBUTION_ID" \
    --paths "/*"
else
  echo "CLOUDFRONT_DISTRIBUTION_ID not set — skipping cache invalidation."
fi

echo "== Done. =="
