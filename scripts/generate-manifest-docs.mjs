#!/usr/bin/env node
// @ts-check

import * as path from "node:path";
import { generateSchema, readMarkdown } from "./generate-schema.mjs";

/**
 * @typedef {import("./generate-schema.mjs").Schema} Schema
 * @typedef {import("./generate-schema.mjs").SchemaDefinition} SchemaDefinition
 */

async function generateManifestDocs() {
  const schema = await generateSchema();

  /**
   * Renders the specified JSON object schema.
   * @param {Schema | SchemaDefinition} definition
   * @param {string[]} toc
   * @param {string[]} lines
   * @param {string} scope
   */
  const render = (definition, toc, lines, scope = "") => {
    definition.allOf?.forEach(({ $ref }) => {
      render(schema.$defs[$ref.replace("#/$defs/", "")], toc, lines, scope);
    });

    if (!definition.properties) {
      return;
    }

    const breadcrumb = (() => {
      let count = 0;
      const length = scope.length;
      for (let i = 0; i < length; ++i) {
        if (scope.charAt(i) === "/") {
          count++;
        }
      }
      return ".".repeat(count);
    })();

    for (const [key, def] of Object.entries(definition.properties)) {
      const { description, markdownDescription, type } = def;
      const text = markdownDescription || description;
      if (!text) {
        continue;
      }

      const anchor =
        breadcrumb.length < 2
          ? scope.split("/").slice(1, 3).concat([key]).join(".")
          : undefined;
      const tag = anchor ? `<a name="${anchor}" />` : "";
      if (anchor) {
        toc.push(`${"  ".repeat(breadcrumb.length)}  - [${key}](#${anchor})`);
      }

      lines.push("<tr>");
      lines.push(`<td valign='baseline'>${tag}${breadcrumb}${key}</td>`);
      lines.push(`<td>\n\n${text}\n\n</td>`);
      lines.push("</tr>");

      if (type === "object") {
        render(def, toc, lines, scope + `/${key}`);
      }
    }
  };

  const toc = ["**Contents**", "- [Properties](#properties)"];
  const lines = ["", "", "## Properties", "", "<table>"];
  render(schema, toc, lines);
  lines.push("</table>");

  const script = path.basename(process.argv[1]);
  const intro = await readMarkdown("introduction");
  return (
    `<!-- This page was generated by ${script} -->\n\n` +
    toc.join("\n") +
    "\n\n" +
    intro +
    lines.join("\n")
  );
}

generateManifestDocs().then(console.log).catch(console.error);
