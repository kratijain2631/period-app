import type { Row } from '../engine';
import account from './account';
import friends from './friends';
import storage from './storage';

/** Every attack matrix file. The runner and the coverage guard both read this list. */
export const files: Record<string, Row[]> = { friends, account, storage };

export const allRows: Row[] = Object.values(files).flat();
