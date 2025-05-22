import { Coordinates } from '@common/coordinates';

export interface DfsData {
    queue: Coordinates[];
    visited: Set<string>;
}
