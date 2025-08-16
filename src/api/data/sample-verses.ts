// Sample Bible verses data structure
// NOTE: This is sample data. For production, you need proper NIV licensing
// and should load actual Bible text from a licensed source

export interface BibleVerse {
  book: string;
  chapter: number;
  verse: number;
  text: string;
  translation: string;
}

// Sample verses for John 1 (similar to the screenshot)
export const sampleVerses: BibleVerse[] = [
  {
    book: 'john',
    chapter: 1,
    verse: 1,
    text: 'In the beginning was the Word, and the Word was with God, and the Word was God.',
    translation: 'NIV'
  },
  {
    book: 'john',
    chapter: 1,
    verse: 2,
    text: 'He was with God in the beginning.',
    translation: 'NIV'
  },
  {
    book: 'john',
    chapter: 1,
    verse: 3,
    text: 'Through him all things were made; without him nothing was made that has been made.',
    translation: 'NIV'
  },
  {
    book: 'john',
    chapter: 1,
    verse: 4,
    text: 'In him was life, and that life was the light of all mankind.',
    translation: 'NIV'
  },
  {
    book: 'john',
    chapter: 1,
    verse: 5,
    text: 'The light shines in the darkness, and the darkness has not overcome it.',
    translation: 'NIV'
  },
  {
    book: 'john',
    chapter: 1,
    verse: 6,
    text: 'There was a man sent from God whose name was John.',
    translation: 'NIV'
  },
  {
    book: 'john',
    chapter: 1,
    verse: 7,
    text: 'He came as a witness to testify concerning that light, so that through him all might believe.',
    translation: 'NIV'
  },
  {
    book: 'john',
    chapter: 1,
    verse: 8,
    text: 'He himself was not the light; he came only as a witness to the light.',
    translation: 'NIV'
  },
  {
    book: 'john',
    chapter: 1,
    verse: 9,
    text: 'The true light that gives light to everyone was coming into the world.',
    translation: 'NIV'
  },
  {
    book: 'john',
    chapter: 1,
    verse: 10,
    text: 'He was in the world, and though the world was made through him, the world did not recognize him.',
    translation: 'NIV'
  },
  // Genesis 1 sample verses
  {
    book: 'genesis',
    chapter: 1,
    verse: 1,
    text: 'In the beginning God created the heavens and the earth.',
    translation: 'NIV'
  },
  {
    book: 'genesis',
    chapter: 1,
    verse: 2,
    text: 'Now the earth was formless and empty, darkness was over the surface of the deep, and the Spirit of God was hovering over the waters.',
    translation: 'NIV'
  },
  {
    book: 'genesis',
    chapter: 1,
    verse: 3,
    text: 'And God said, "Let there be light," and there was light.',
    translation: 'NIV'
  },
  {
    book: 'genesis',
    chapter: 1,
    verse: 4,
    text: 'God saw that the light was good, and he separated the light from the darkness.',
    translation: 'NIV'
  },
  {
    book: 'genesis',
    chapter: 1,
    verse: 5,
    text: 'God called the light "day," and the darkness he called "night." And there was evening, and there was morning—the first day.',
    translation: 'NIV'
  },
  // Matthew 1 sample verses
  {
    book: 'matthew',
    chapter: 1,
    verse: 1,
    text: 'This is the genealogy of Jesus the Messiah the son of David, the son of Abraham:',
    translation: 'NIV'
  },
  {
    book: 'matthew',
    chapter: 1,
    verse: 2,
    text: 'Abraham was the father of Isaac, Isaac the father of Jacob, Jacob the father of Judah and his brothers,',
    translation: 'NIV'
  },
  {
    book: 'matthew',
    chapter: 1,
    verse: 3,
    text: 'Judah the father of Perez and Zerah, whose mother was Tamar, Perez the father of Hezron, Hezron the father of Ram,',
    translation: 'NIV'
  },
  // Psalm 23 sample verses
  {
    book: 'psalms',
    chapter: 23,
    verse: 1,
    text: 'The Lord is my shepherd, I lack nothing.',
    translation: 'NIV'
  },
  {
    book: 'psalms',
    chapter: 23,
    verse: 2,
    text: 'He makes me lie down in green pastures, he leads me beside quiet waters,',
    translation: 'NIV'
  },
  {
    book: 'psalms',
    chapter: 23,
    verse: 3,
    text: 'he refreshes my soul. He guides me along the right paths for his name\'s sake.',
    translation: 'NIV'
  },
  {
    book: 'psalms',
    chapter: 23,
    verse: 4,
    text: 'Even though I walk through the darkest valley, I will fear no evil, for you are with me; your rod and your staff, they comfort me.',
    translation: 'NIV'
  },
  {
    book: 'psalms',
    chapter: 23,
    verse: 5,
    text: 'You prepare a table before me in the presence of my enemies. You anoint my head with oil; my cup overflows.',
    translation: 'NIV'
  },
  {
    book: 'psalms',
    chapter: 23,
    verse: 6,
    text: 'Surely your goodness and love will follow me all the days of my life, and I will dwell in the house of the Lord forever.',
    translation: 'NIV'
  }
];

// Helper function to get verses for a specific chapter
export function getChapterVerses(book: string, chapter: number): BibleVerse[] {
  return sampleVerses.filter(v => 
    v.book.toLowerCase() === book.toLowerCase() && 
    v.chapter === chapter
  );
}

// Helper function to get a specific verse
export function getVerse(book: string, chapter: number, verse: number): BibleVerse | undefined {
  return sampleVerses.find(v => 
    v.book.toLowerCase() === book.toLowerCase() && 
    v.chapter === chapter && 
    v.verse === verse
  );
}

// Helper function to get verse range
export function getVerseRange(
  book: string, 
  chapter: number, 
  startVerse: number, 
  endVerse: number
): BibleVerse[] {
  return sampleVerses.filter(v => 
    v.book.toLowerCase() === book.toLowerCase() && 
    v.chapter === chapter && 
    v.verse >= startVerse && 
    v.verse <= endVerse
  );
}