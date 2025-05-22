export type DeepReadonly<T> = T extends unknown[] ? DeepReadonlyArray<T[number]> : T extends object ? DeepReadonlyObject<T> : T;

interface DeepReadonlyArray<T> extends ReadonlyArray<DeepReadonly<T>> {}

type DeepReadonlyObject<T> = {
    readonly [P in NonFunctionPropertyNames<T>]: DeepReadonly<T[P]>;
};

// Function needs to be used as a type here, we do not want to select any specific functions, we want to select all functions within the object
// eslint-disable-next-line @typescript-eslint/ban-types
type NonFunctionPropertyNames<T> = { [K in keyof T]: T[K] extends Function ? never : K }[keyof T];
