const { Parser } = require("json2csv");

const toCsv = (rows) => {
  if (!rows || rows.length === 0) {
    return "";
  }

  const fields = Object.keys(rows[0]);
  const parser = new Parser({ fields });
  return parser.parse(rows);
};

const sendCsv = (res, filename, rows) => {
  const csv = toCsv(rows);
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename=${filename}`);
  return res.status(200).send(csv);
};

module.exports = { toCsv, sendCsv };
