import { Component } from '@angular/core';

/**
 * Shared button styling applied to a native `<button>` or `<a>`.
 *
 * It is an attribute component (not `<app-button>`) so the host keeps its native role,
 * focus and keyboard behaviour: `<button appButton>` for actions, `<a appButton routerLink>`
 * for navigation. Links also work before hydration on prerendered pages.
 */
@Component({
  selector: 'button[appButton], a[appButton]',
  styleUrl: './button.scss',
  templateUrl: './button.html',
  host: { class: 'app-button' },
})
export class Button {}
