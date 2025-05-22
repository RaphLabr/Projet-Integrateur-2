import { Component, Input } from '@angular/core';
import { Router } from '@angular/router';

@Component({
    selector: 'app-header',
    templateUrl: './header.component.html',
    styleUrl: './header.component.scss',
})
export class HeaderComponent {
    @Input() title: string;

    constructor(private _router: Router) {}

    redirectToHome(): void {
        this._router.navigate(['/']);
    }
}
