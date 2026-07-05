import fs from "fs";
import AdmZip from "adm-zip";
import { XMLParser } from "fast-xml-parser";

export async function extractPptx(filePath) {
  const zip = new AdmZip(filePath);
  const parser = new XMLParser({
    ignoreAttributes: false
  });

  let text = "";

  const entries = zip
    .getEntries()
    .filter(e => e.entryName.startsWith("ppt/slides/slide"));

  for (const entry of entries) {
    const xml = entry.getData().toString("utf8");

    try {
      const json = parser.parse(xml);

      collectText(json);

    } catch {
      continue;
    }
  }

  function collectText(obj) {
    if (!obj) return;

    if (typeof obj === "string") {
      text += obj + "\n";
      return;
    }

    if (Array.isArray(obj)) {
      obj.forEach(collectText);
      return;
    }

    if (typeof obj === "object") {
      for (const key in obj) {
        collectText(obj[key]);
      }
    }
  }

  return text
    .replace(/\s+/g, " ")
    .trim();
}