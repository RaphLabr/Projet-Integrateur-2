import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Routes } from '@angular/router';
import { MainPageComponent } from '@app/pages/main-page/main-page.component';

const routes: Routes = [];

describe('MainPageComponent', () => {
    let component: MainPageComponent;
    let fixture: ComponentFixture<MainPageComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [MainPageComponent],
            providers: [provideHttpClientTesting(), provideRouter(routes)],
        }).compileComponents();
    });

    beforeEach(() => {
        fixture = TestBed.createComponent(MainPageComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
