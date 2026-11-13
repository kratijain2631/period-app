import { createContext, useContext, useState, type ReactNode } from 'react';

type Threads = {
  current: string | null;
  setCurrent: React.Dispatch<React.SetStateAction<string | null>>;
};

const Context = createContext<Threads | null>(null);

export function CommentThreads({ children }: { children: ReactNode }) {
  const [current, setCurrent] = useState<string | null>(null);
  return <Context.Provider value={{ current, setCurrent }}>{children}</Context.Provider>;
}

export const useCommentThreads = () => useContext(Context);
