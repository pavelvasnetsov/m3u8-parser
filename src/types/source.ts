/** Позиция в исходной строке плейлиста. */
export interface SourcePosition {
  /** Номер строки, начиная с 1. */
  readonly line: number
  /** Номер столбца, начиная с 1. */
  readonly column: number
  /** Смещение от начала текста плейлиста в единицах UTF-16, начиная с 0. */
  readonly offset: number
}
/** Строка исходного текста плейлиста. */
export interface SourceLine {
  /** Текст без символов переноса строки. */
  readonly text: string
  /** Позиция начала строки в плейлисте. */
  readonly position: SourcePosition
}
