export interface Point {
  pageIndex: number;
  textIndex: number; // Index of the text item in the page's text content
  textContent: string; // The actual text of the item clicked
  x: number;
  y: number;
}

export interface Segment {
  id: string;
  startPoint: Point;
  endPoint: Point;
  text: string;
  timestamp: number;
}
