export interface AppItem {
  id: string;
  label: string;
  title: string;
  url: string;
  icon: string;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  updatedAt: number;
}
