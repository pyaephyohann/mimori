export type Photo = {
  id: string;
  src: string;
  /** Handwritten-style caption shown inside the polaroid frame. */
  caption: string;
  alt: string;
};

/**
 * The photos in `public/couple-images`.
 *
 * The originals are `.HEIC`, which browsers cannot decode, so each has a JPEG
 * sibling (longest edge 1600px) generated from it. Those JPEGs are what the UI
 * references; the `.HEIC` originals are left untouched.
 *
 * Captions are decorative scrapbook labels, not dated facts — edit them here.
 */
export const photos: readonly Photo[] = [
  { id: "img-0823", src: "/couple-images/IMG_0823.jpg", caption: "us, always", alt: "A photo of us" },
  { id: "img-0832", src: "/couple-images/IMG_0832.jpg", caption: "my favourite", alt: "A photo of us" },
  { id: "img-0980", src: "/couple-images/IMG_0980.jpg", caption: "this day", alt: "A photo of us" },
  { id: "img-1037", src: "/couple-images/IMG_1037.jpg", caption: "together", alt: "A photo of us" },
  { id: "img-1041", src: "/couple-images/IMG_1041.jpg", caption: "little moments", alt: "A photo of us" },
  { id: "img-1047", src: "/couple-images/IMG_1047.jpg", caption: "you & me", alt: "A photo of us" },
  { id: "img-1050", src: "/couple-images/IMG_1050.jpg", caption: "so happy", alt: "A photo of us" },
  { id: "img-1066", src: "/couple-images/IMG_1066.JPG", caption: "just us", alt: "A photo of us" },
];
