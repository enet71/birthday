import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AppLayoutComponent } from '@birthday/web-layout-shell';
import { AccountButtonComponent } from './components/account-button/account-button.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, AppLayoutComponent, AccountButtonComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {}
