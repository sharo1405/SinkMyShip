import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Button } from '@shared/ui/button/button';

/**
 * Landing page: the welcome heading and a Start button that goes to fleet setup.
 * `heading` is supplied from route `data` via `withComponentInputBinding()`.
 */
@Component({
  selector: 'app-home-page',
  imports: [RouterLink, Button],
  styleUrl: './home-page.scss',
  templateUrl: './home-page.html',
})
export class HomePage {
  readonly heading = input.required<string>();
}
