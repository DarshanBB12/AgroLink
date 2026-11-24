// Escape user input before it is used inside a RegExp so that characters such as
// ".*(" cannot change the query semantics or trigger catastrophic backtracking.
const escapeRegex = (value = "") => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Trim, collapse whitespace and cap the length of a free-text search query.
const cleanQuery = (value = "") => String(value).replace(/\s+/g, " ").trim().slice(0, 100);

module.exports = { escapeRegex, cleanQuery };
