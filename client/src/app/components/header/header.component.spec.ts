import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { HeaderComponent } from './header.component';
import { provideLocationMocks } from '@angular/common/testing';

describe('HeaderComponent', () => {
    let component: HeaderComponent;
    let fixture: ComponentFixture<HeaderComponent>;
    let router: Router;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [HeaderComponent],
            providers: [provideRouter([]), provideLocationMocks()],
        }).compileComponents();

        fixture = TestBed.createComponent(HeaderComponent);
        component = fixture.componentInstance;
        router = TestBed.inject(Router);
        spyOn(router, 'navigate');
    });

    it('should create the component', () => {
        expect(component).toBeTruthy();
    });

    it('should have a title input', () => {
        const testTitle = 'Test Title';
        component.title = testTitle;
        fixture.detectChanges();

        const titleElement = fixture.nativeElement.querySelector('h1');
        expect(titleElement.textContent).toContain(testTitle);
    });

    it('should call redirectToHome and navigate to the home route', () => {
        component.redirectToHome();
        expect(router.navigate).toHaveBeenCalledWith(['/']);
    });

    it('should render the title in the template', () => {
        const testTitle = 'Test Title';
        component.title = testTitle;
        fixture.detectChanges();

        const titleElement = fixture.nativeElement.querySelector('h1');
        expect(titleElement.textContent).toContain(testTitle);
    });
});
