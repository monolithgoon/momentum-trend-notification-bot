// ⚠️ Types-only utilities (no runtime code here)

/** Keys of T whose values are assignable to V */
export type KeysMatching<T, V> = {
  [K in keyof T]-?: T[K] extends V ? K : never
}[keyof T];

/** Keys of T whose values are string */
export type StringKeyOf<T> = KeysMatching<T, string>;