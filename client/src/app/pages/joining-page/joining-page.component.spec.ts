import { ComponentFixture, TestBed } from '@angular/core/testing';
import { JoiningPageComponent } from '@app/pages/joining-page/joining-page.component';
import { JoiningPageService } from '@app/services/joining-page-service/joining-page.service';

describe('JoiningPageComponent', () => {
    let component: JoiningPageComponent;
    let fixture: ComponentFixture<JoiningPageComponent>;
    const mockJoiningPageService = {
        lobbyId: '',
        onSubmit: jasmine.createSpy('onSubmit'),
    };

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [JoiningPageComponent],
            providers: [{ provide: JoiningPageService, useValue: mockJoiningPageService }],
        }).compileComponents();

        fixture = TestBed.createComponent(JoiningPageComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should set lobbyId in service and call onSubmit', () => {
        component.lobbyId = 'test-lobby-id';

        component.onSubmit();

        expect(mockJoiningPageService.lobbyId).toBe('test-lobby-id');
        expect(mockJoiningPageService.onSubmit).toHaveBeenCalled();
    });
});
