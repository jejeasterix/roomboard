import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import * as boardFiles from "../app/board-files";
import * as boardIo from "../app/board-io";
import type * as ArchivePath from "./archive-path";
import {
  BOARD_BAD_LIST_PREFIX, BOARD_MAX_OBJECTS, BOARD_OBJECTS_MESSAGE, BOARD_OP, decodeBoardList, encodeBoardList, hexOf, MAX_GROUP_DEPTH, MAX_POINTS, MAX_SPANS, rgbOf, SKIPPED_LABEL,
  type BoardListData, type BoardListPage, type BoardObject,
} from "./board-list";
import * as boardReader from "./board-reader";
import type * as Rbpack from "./rbpack";
import type * as ZipRead from "./zip-read";

/** Vrai seulement si A et B sont le même type (contrôlé par `tsc --noEmit`). */
type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;

const pages: BoardListPage[] = [
  {
    background: "#ffffff",
    objects: [
      { kind: "shape", shape: "ellipse", m: [1, 0, 0, 1, 10, 20], x0: 0, y0: 0, x1: 50, y1: 40, color: "#ff0000", width: 2, fill: "#00ff00" },
      { kind: "stroke", m: [1, 0, 0, 1, 0, 0], color: "#000000", width: 3, points: [0, 0, 0.5, 10, 10, 0.5] },
      {
        kind: "group",
        children: [
          { kind: "text", m: [1, 0, 0, 1, 0, 0], x: 5, y: 6, boxWidth: 100, boxHeight: 20, size: 16, color: "#123456", spans: [{ text: "Bonjour", attrs: { bold: true, color: "#abcdef", size: 18, font: "Arial" } }, { text: "monde", attrs: {} }] },
          { kind: "image", m: [1, 0, 0, 1, 0, 0], x: 0, y: 0, w: 64, h: 32, path: "images/a.png" },
        ],
      },
    ],
  },
  { background: null, objects: [] },
];

describe("board-list (OF13, D6)", () => {
  it("aller-retour encode → decode identique", () => {
    const list = encodeBoardList(pages);
    expect(decodeBoardList(list.ops, list.texts)).toEqual(pages);
  });

  it("textes internés à leur première apparition", () => {
    expect(encodeBoardList(pages).texts).toEqual(["Bonjour", "Arial", "monde", "images/a.png"]);
  });

  it("budget d'objets : les feuilles comptent, BOARD_OBJECTS_MESSAGE dès la première de trop", () => {
    const list = encodeBoardList(pages);
    expect(() => decodeBoardList(list.ops, list.texts, 3)).toThrow(BOARD_OBJECTS_MESSAGE);
    expect(decodeBoardList(list.ops, list.texts, 4)).toHaveLength(2);
  });

  it("flux coupé : liste de tableau invalide", () => {
    expect(() => decodeBoardList([BOARD_OP.page, BOARD_OP.shape], [])).toThrow(BOARD_BAD_LIST_PREFIX);
  });

  it("bornes et libellés à l'identique", () => {
    expect([BOARD_MAX_OBJECTS, MAX_GROUP_DEPTH, MAX_POINTS, MAX_SPANS]).toEqual([100_000, 256, 1_000_000, 10_000]);
    expect(BOARD_OBJECTS_MESSAGE).toBe("fichier de tableau trop gros (plus de 100 000 objets)");
    expect(SKIPPED_LABEL).toEqual(["objet illisible ignoré", "objets illisibles ignorés"]);
    expect([hexOf(1, 2, 255), rgbOf("#0102ff"), rgbOf("rouge")]).toEqual(["#0102ff", [1, 2, 255], [0, 0, 0]]);
  });

  it("mêmes valeurs réexportées par board-io, board-files et board-reader (H3)", () => {
    expect(boardIo.encodeBoardList).toBe(encodeBoardList);
    expect(boardIo.decodeBoardList).toBe(decodeBoardList);
    expect(boardIo.hexOf).toBe(hexOf);
    expect(boardIo.rgbOf).toBe(rgbOf);
    expect([boardIo.BOARD_OP, boardIo.MAX_GROUP_DEPTH, boardIo.MAX_POINTS, boardIo.MAX_SPANS, boardIo.BOARD_BAD_LIST_PREFIX]).toEqual([BOARD_OP, MAX_GROUP_DEPTH, MAX_POINTS, MAX_SPANS, BOARD_BAD_LIST_PREFIX]);
    expect(boardFiles.SKIPPED_LABEL).toBe(SKIPPED_LABEL);
    expect([boardFiles.BOARD_MAX_OBJECTS, boardFiles.BOARD_OBJECTS_MESSAGE, boardReader.BOARD_OBJECTS_MESSAGE]).toEqual([BOARD_MAX_OBJECTS, BOARD_OBJECTS_MESSAGE, BOARD_OBJECTS_MESSAGE]);
    const same: [
      Same<boardIo.BoardObject, BoardObject>,
      Same<boardIo.BoardListPage, BoardListPage>,
      Same<boardIo.BoardListData, BoardListData>,
      Same<ZipRead.ZipFile, ArchivePath.ZipFile>,
      Same<Rbpack.ZipFile, ArchivePath.ZipFile>,
    ] = [true, true, true, true, true];
    expect(same.every(Boolean)).toBe(true);
  });

  it("feuille : n'importe que des types de core/api", () => {
    const lines = readFileSync(new URL("./board-list.ts", import.meta.url), "utf8")
      .split("\n")
      .filter((l) => /^(import|export .* from)\s/.test(l));
    expect(lines).toEqual(['import type { Matrix, ShapeKind, TextSpan } from "../core/api";']);
  });

  it("le Worker ZIP et zip-read n'importent plus app/", () => {
    for (const f of ["./zip-worker.ts", "./zip-read.ts", "./olf-read.ts"]) {
      expect(readFileSync(new URL(f, import.meta.url), "utf8"), f).not.toMatch(/from "\.\.\/app\//);
    }
  });
});
