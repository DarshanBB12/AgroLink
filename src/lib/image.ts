// Downscale an uploaded picture to a small JPEG data URL so avatars stay well under the 300 KB server limit.
export const resizeImageToDataUrl = (file: File, maxSize = 256, quality = 0.85): Promise<string> =>
  new Promise((resolve, reject) => {
    if (!/^image\/(png|jpe?g|webp|gif)$/i.test(file.type)) return reject(new Error("invalid-type"));
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("read-failed"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("read-failed"));
      img.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("read-failed"));
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
