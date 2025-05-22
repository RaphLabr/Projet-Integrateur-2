import { NgClass } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { Router } from '@angular/router';
import { MapModel } from '@app/models/map-model';
import { AdminPageService } from '@app/services/admin-page-service/admin-page.service';
import { environment } from 'src/environments/environment';

@Component({
    selector: 'app-admin-page',
    standalone: true,
    imports: [NgClass, FormsModule],
    templateUrl: './admin-page.component.html',
    styleUrls: ['../../global-css/global.scss', './admin-page.component.scss', '../../global-css/admin-creation.scss'],
})
export class AdminPageComponent implements OnInit {
    games: MapModel[] = [];
    hoverIndex = -1;
    sizeInput: string;
    toggleState: false;
    sizeChoiceVisibility = false;
    url: string = environment.serverUrl;
    constructor(
        private _router: Router,
        private _adminPageService: AdminPageService,
    ) {}

    ngOnInit(): void {
        this._adminPageService.fetchData(this.games);
    }

    setHover(index: number): void {
        this.hoverIndex = index;
    }

    clearHover(): void {
        this.hoverIndex = -1;
    }

    toggleSizeChoice(): void {
        this.sizeChoiceVisibility = !this.sizeChoiceVisibility;
    }

    changeVisibility(index: number): void {
        this._adminPageService.changeVisibility(index, this.games);
    }

    onSubmit(form: NgForm, size: string): void {
        this._adminPageService.onSubmit(form, size);
    }

    editGame(index: number): void {
        this._router.navigate(['/edition'], { queryParams: { mapId: this.games[index].id, mode: this.games[index].mode } });
    }

    deleteGame(index: number): void {
        this._adminPageService.deleteGame(index, this.games);
    }
}
