import { Component, Input } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { MapModel } from '@app/models/map-model';
import { CreationPageComponent } from '@app/pages/creation-page/creation-page/creation-page.component';
import { CreationPageService } from '@app/services/creation-page-service/creation-page.service';
import { GameMode } from '@common/game-mode';
import { MapSize } from '@common/map-size';
import { of } from 'rxjs';

@Component({ selector: 'app-mock', template: '' })
class MockComponent {
    @Input() games: MapModel[] = [];
}

describe('CreationPageComponent', () => {
    let component: CreationPageComponent;
    let fixture: ComponentFixture<CreationPageComponent>;
    let creationPageService: jasmine.SpyObj<CreationPageService>;

    beforeEach(async () => {
        creationPageService = jasmine.createSpyObj('CreationPageService', ['fetchData']);

        await TestBed.configureTestingModule({
            imports: [CreationPageComponent, MockComponent],
            providers: [
                { provide: CreationPageService, useValue: creationPageService },
                { provide: ActivatedRoute, useValue: {} },
            ],
        }).compileComponents();
    });

    beforeEach(() => {
        fixture = TestBed.createComponent(CreationPageComponent);
        component = fixture.componentInstance;
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should fetch data on init', () => {
        const mockData: MapModel[] = [
            {
                id: '1',
                name: 'Test Map',
                mode: GameMode.Classic,
                visibility: false,
                lastModified: '',
                size: MapSize.Small,
                creator: '',
                terrain: [],
                description: '',
            },
        ];
        creationPageService.fetchData.and.returnValue(of(mockData));
        fixture.detectChanges();
        expect(component.games).toEqual(mockData);
    });

    it('should set hover index', () => {
        component.setHover(2);
        expect(component.hoverIndex).toBe(2);
    });

    it('should clear hover index', () => {
        component.hoverIndex = 5;
        component.clearHover();
        expect(component.hoverIndex).toBe(-1);
    });
});
