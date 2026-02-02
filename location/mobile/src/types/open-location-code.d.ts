declare module 'open-location-code' {
  interface CodeArea {
    latitudeLo: number;
    latitudeHi: number;
    longitudeLo: number;
    longitudeHi: number;
    latitudeCenter: number;
    longitudeCenter: number;
    codeLength: number;
  }

  /**
   * Encode a location into a Plus Code.
   */
  export function encode(latitude: number, longitude: number, codeLength?: number): string;

  /**
   * Decode a Plus Code to a CodeArea.
   */
  export function decode(code: string): CodeArea;

  /**
   * Shorten a Plus Code using a reference location.
   */
  export function shorten(code: string, latitude: number, longitude: number): string;

  /**
   * Recover a short Plus Code to a full code using a reference location.
   */
  export function recoverNearest(shortCode: string, latitude: number, longitude: number): string;

  /**
   * Check if a Plus Code is valid.
   */
  export function isValid(code: string): boolean;

  /**
   * Check if a Plus Code is a full code.
   */
  export function isFull(code: string): boolean;

  /**
   * Check if a Plus Code is a short code.
   */
  export function isShort(code: string): boolean;

  const OpenLocationCode: {
    encode: typeof encode;
    decode: typeof decode;
    shorten: typeof shorten;
    recoverNearest: typeof recoverNearest;
    isValid: typeof isValid;
    isFull: typeof isFull;
    isShort: typeof isShort;
  };

  export default OpenLocationCode;
}
