"use strict";Object.defineProperty(exports, "__esModule", {value: true});require('./chunk-S65R2BUY.js');
function parseNameFromUri(uriString) {
  const uri = new URL(uriString);
  return uri.hash.length > 0 ? uri.hash.slice(1) : uri.pathname.slice(uri.pathname.lastIndexOf("/") + 1);
}
function groupBySubject(quads) {
  return quads.reduce((index, quad) => {
    if (index.has(quad.subject)) {
      index.get(quad.subject).push(quad);
    } else {
      index.set(quad.subject, [quad]);
    }
    return index;
  }, /* @__PURE__ */ new Map());
}
function printQuads(quads, label) {
  if (label) {
    console.log(`${label} ==> `);
  }
  let q = quads instanceof Array ? quads : quads.getQuads(null, null, null, null);
  q.forEach((q2) => console.log(`[${q2.subject.value} ${q2.predicate.value} ${q2.object.value}]`));
}




exports.groupBySubject = groupBySubject; exports.parseNameFromUri = parseNameFromUri; exports.printQuads = printQuads;
