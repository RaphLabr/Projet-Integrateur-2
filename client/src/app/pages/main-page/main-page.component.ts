import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
    selector: 'app-main-page',
    templateUrl: './main-page.component.html',
    styleUrls: ['../../global-css/global.scss', './main-page.component.scss'],
    imports: [RouterLink],
})
export class MainPageComponent {}
