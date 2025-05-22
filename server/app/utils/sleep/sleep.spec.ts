import { sleep } from '@app/utils/sleep/sleep';
import { NUMBER_OF_MS_IN_S } from '@common/timer-constants';

describe('sleep', () => {
    beforeEach(() => {
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it('should return a Promise', () => {
        const result = sleep(NUMBER_OF_MS_IN_S);
        expect(result).toBeInstanceOf(Promise);
    });

    it('should resolve after the specified time', async () => {
        const promise = sleep(NUMBER_OF_MS_IN_S);

        jest.advanceTimersByTime(NUMBER_OF_MS_IN_S);
        await expect(promise).resolves.toBeUndefined();
    });
});
