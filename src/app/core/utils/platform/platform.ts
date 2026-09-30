import { isPlatformBrowser } from '@angular/common';
import { inject, PLATFORM_ID } from '@angular/core';

/**
 * True in the browser, false while rendering on the server. Clocks and the computer's moves
 * only run in the browser. Call it in an injection context (a field initialiser).
 */
export function injectIsBrowser(): boolean {
  return isPlatformBrowser(inject(PLATFORM_ID));
}
