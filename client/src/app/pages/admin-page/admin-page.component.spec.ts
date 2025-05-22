import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule, NgForm } from '@angular/forms';
import { Router } from '@angular/router';
import { MapModel } from '@app/models/map-model';
import { AdminPageComponent } from '@app/pages/admin-page/admin-page.component';
import { AdminPageService } from '@app/services/admin-page-service/admin-page.service';

describe('AdminPageComponent', () => {
    let component: AdminPageComponent;
    let fixture: ComponentFixture<AdminPageComponent>;
    let adminPageService: jasmine.SpyObj<AdminPageService>;
    let router: jasmine.SpyObj<Router>;

    beforeEach(() => {
        adminPageService = jasmine.createSpyObj('AdminPageService', ['fetchData', 'changeVisibility', 'onSubmit', 'deleteGame']);
        router = jasmine.createSpyObj('Router', ['navigate']);

        TestBed.configureTestingModule({
            providers: [
                { provide: AdminPageService, useValue: adminPageService },
                { provide: Router, useValue: router },
            ],
            imports: [FormsModule],
        }).compileComponents();

        fixture = TestBed.createComponent(AdminPageComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should call fetchData on init', () => {
        expect(adminPageService.fetchData).toHaveBeenCalledWith(component.games);
    });

    it('should set hoverIndex on setHover', () => {
        component.setHover(2);
        expect(component.hoverIndex).toBe(2);
    });

    it('should reset hoverIndex on clearHover', () => {
        component.hoverIndex = 3;
        component.clearHover();
        expect(component.hoverIndex).toBe(-1);
    });

    it('should toggle sizeChoiceVisibility on toggleSizeChoice', () => {
        component.sizeChoiceVisibility = false;
        component.toggleSizeChoice();
        expect(component.sizeChoiceVisibility).toBeTrue();
    });

    it('should call changeVisibility with index and games', () => {
        component.changeVisibility(1);
        expect(adminPageService.changeVisibility).toHaveBeenCalledWith(1, component.games);
    });

    it('should call onSubmit with form and size', () => {
        const form = {} as NgForm;
        component.onSubmit(form, 'large');
        expect(adminPageService.onSubmit).toHaveBeenCalledWith(form, 'large');
    });

    it('should navigate to edition page with correct params', () => {
        component.games = [{ id: '123', name: 'cool', mode: 'Classique' } as MapModel];
        component.editGame(0);
        expect(router.navigate).toHaveBeenCalledWith(['/edition'], { queryParams: { mapId: '123', mode: 'Classique' } });
    });

    it('should call deleteGame with index and games', () => {
        component.deleteGame(0);
        expect(adminPageService.deleteGame).toHaveBeenCalledWith(0, component.games);
    });
});
