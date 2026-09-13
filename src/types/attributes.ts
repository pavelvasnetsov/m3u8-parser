import type { SourcePosition } from "./source.js"

/** Атрибут с позициями имени и значения в исходном документе. */
export interface ParsedAttribute extends Attribute {
  /** Позиция первого символа имени. */
  readonly position: SourcePosition
  /** Позиция значения, включая открывающую кавычку. */
  readonly valuePosition: SourcePosition
}

/** Допустимые значения HDCP-LEVEL. */
export type HdcpLevel = "NONE" | "TYPE-0"

/** Атрибут. */
export interface Attribute {
  /** Имя атрибута. */
  readonly name: string
  /** Исходное значение. */
  readonly rawValue: string
}

/** Разрешение видео. */
export interface Resolution {
  /** Число пикселей по горизонтали. */
  readonly width: bigint
  /** Число пикселей по вертикали. */
  readonly height: bigint
}

/** Различает CLOSED-CAPTIONS=NONE и заключённый в кавычки идентификатор группы. */
export type ClosedCaptions =
  | { readonly kind: "none" }
  | { readonly kind: "group"; readonly groupId: string }
