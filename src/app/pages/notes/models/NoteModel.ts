export interface NoteModel {
  id: string;
  title: string;
  description: string;
  edited: Date;
  favourite: boolean;
  fixed: boolean;
  fixedAt: Date | null;
}
