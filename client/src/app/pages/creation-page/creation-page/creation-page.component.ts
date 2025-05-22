import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';

import { RouterModule } from '@angular/router';
import { MapModel } from '@app/models/map-model';
import { CreationPageService } from '@app/services/creation-page-service/creation-page.service';
import { environment } from 'src/environments/environment';

@Component({
    selector: 'app-creation-page',

    templateUrl: './creation-page.component.html',
    styleUrls: ['../../../global-css/global.scss', './creation-page.component.scss', '../../../global-css/admin-creation.scss'],
    imports: [CommonModule, RouterModule],
})
export class CreationPageComponent implements OnInit {
    games: MapModel[] = [];
    hoverIndex = -1;
    readonly url = environment.serverUrl;

    constructor(private _creationPageService: CreationPageService) {}

    ngOnInit() {
        this._creationPageService.fetchData().subscribe((data) => {
            this.games = data;
        });
    }

    setHover(index: number): void {
        this.hoverIndex = index;
    }

    clearHover(): void {
        this.hoverIndex = -1;
    }
}
