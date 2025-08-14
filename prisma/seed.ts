import { PrismaClient, Testament } from '@prisma/client';

const prisma = new PrismaClient();

// Bible Books Data - All 66 books with accurate metadata
const bibleBooks = [
  // Old Testament
  { bookNumber: 1, name: 'Genesis', abbr: 'GEN', testament: Testament.OLD, chapterCount: 50, bookOrder: 1, author: 'Moses', dateWritten: '~1445 BC', description: 'The book of beginnings' },
  { bookNumber: 2, name: 'Exodus', abbr: 'EXO', testament: Testament.OLD, chapterCount: 40, bookOrder: 2, author: 'Moses', dateWritten: '~1445 BC', description: 'The departure from Egypt' },
  { bookNumber: 3, name: 'Leviticus', abbr: 'LEV', testament: Testament.OLD, chapterCount: 27, bookOrder: 3, author: 'Moses', dateWritten: '~1445 BC', description: 'Laws for priests and Levites' },
  { bookNumber: 4, name: 'Numbers', abbr: 'NUM', testament: Testament.OLD, chapterCount: 36, bookOrder: 4, author: 'Moses', dateWritten: '~1445 BC', description: 'Wandering in the wilderness' },
  { bookNumber: 5, name: 'Deuteronomy', abbr: 'DEU', testament: Testament.OLD, chapterCount: 34, bookOrder: 5, author: 'Moses', dateWritten: '~1406 BC', description: 'Repetition of the Law' },
  { bookNumber: 6, name: 'Joshua', abbr: 'JOS', testament: Testament.OLD, chapterCount: 24, bookOrder: 6, author: 'Joshua', dateWritten: '~1375 BC', description: 'Conquest of Canaan' },
  { bookNumber: 7, name: 'Judges', abbr: 'JDG', testament: Testament.OLD, chapterCount: 21, bookOrder: 7, author: 'Samuel', dateWritten: '~1043 BC', description: 'Rule by judges' },
  { bookNumber: 8, name: 'Ruth', abbr: 'RUT', testament: Testament.OLD, chapterCount: 4, bookOrder: 8, author: 'Samuel', dateWritten: '~1030-1010 BC', description: 'Story of loyalty and redemption' },
  { bookNumber: 9, name: '1 Samuel', abbr: '1SA', testament: Testament.OLD, chapterCount: 31, bookOrder: 9, author: 'Samuel/Nathan/Gad', dateWritten: '~931-722 BC', description: 'Samuel and Saul' },
  { bookNumber: 10, name: '2 Samuel', abbr: '2SA', testament: Testament.OLD, chapterCount: 24, bookOrder: 10, author: 'Nathan/Gad', dateWritten: '~931-722 BC', description: 'David\'s reign' },
  { bookNumber: 11, name: '1 Kings', abbr: '1KI', testament: Testament.OLD, chapterCount: 22, bookOrder: 11, author: 'Jeremiah', dateWritten: '~561-538 BC', description: 'Solomon and divided kingdom' },
  { bookNumber: 12, name: '2 Kings', abbr: '2KI', testament: Testament.OLD, chapterCount: 25, bookOrder: 12, author: 'Jeremiah', dateWritten: '~561-538 BC', description: 'History of Israel and Judah' },
  { bookNumber: 13, name: '1 Chronicles', abbr: '1CH', testament: Testament.OLD, chapterCount: 29, bookOrder: 13, author: 'Ezra', dateWritten: '~450-430 BC', description: 'David\'s reign from priestly view' },
  { bookNumber: 14, name: '2 Chronicles', abbr: '2CH', testament: Testament.OLD, chapterCount: 36, bookOrder: 14, author: 'Ezra', dateWritten: '~450-430 BC', description: 'History of Judah' },
  { bookNumber: 15, name: 'Ezra', abbr: 'EZR', testament: Testament.OLD, chapterCount: 10, bookOrder: 15, author: 'Ezra', dateWritten: '~457-444 BC', description: 'Return from exile' },
  { bookNumber: 16, name: 'Nehemiah', abbr: 'NEH', testament: Testament.OLD, chapterCount: 13, bookOrder: 16, author: 'Nehemiah', dateWritten: '~424-400 BC', description: 'Rebuilding Jerusalem\'s walls' },
  { bookNumber: 17, name: 'Esther', abbr: 'EST', testament: Testament.OLD, chapterCount: 10, bookOrder: 17, author: 'Unknown', dateWritten: '~450-331 BC', description: 'Jewish queen saves her people' },
  { bookNumber: 18, name: 'Job', abbr: 'JOB', testament: Testament.OLD, chapterCount: 42, bookOrder: 18, author: 'Unknown', dateWritten: '~2100-1800 BC', description: 'Suffering and sovereignty' },
  { bookNumber: 19, name: 'Psalms', abbr: 'PSA', testament: Testament.OLD, chapterCount: 150, bookOrder: 19, author: 'David and others', dateWritten: '~1410-450 BC', description: 'Songs and prayers' },
  { bookNumber: 20, name: 'Proverbs', abbr: 'PRO', testament: Testament.OLD, chapterCount: 31, bookOrder: 20, author: 'Solomon and others', dateWritten: '~971-686 BC', description: 'Wisdom for living' },
  { bookNumber: 21, name: 'Ecclesiastes', abbr: 'ECC', testament: Testament.OLD, chapterCount: 12, bookOrder: 21, author: 'Solomon', dateWritten: '~940 BC', description: 'Search for meaning' },
  { bookNumber: 22, name: 'Song of Solomon', abbr: 'SNG', testament: Testament.OLD, chapterCount: 8, bookOrder: 22, author: 'Solomon', dateWritten: '~971-965 BC', description: 'Love poetry' },
  { bookNumber: 23, name: 'Isaiah', abbr: 'ISA', testament: Testament.OLD, chapterCount: 66, bookOrder: 23, author: 'Isaiah', dateWritten: '~700-681 BC', description: 'Salvation of the Lord' },
  { bookNumber: 24, name: 'Jeremiah', abbr: 'JER', testament: Testament.OLD, chapterCount: 52, bookOrder: 24, author: 'Jeremiah', dateWritten: '~627-586 BC', description: 'Warning and hope' },
  { bookNumber: 25, name: 'Lamentations', abbr: 'LAM', testament: Testament.OLD, chapterCount: 5, bookOrder: 25, author: 'Jeremiah', dateWritten: '~586 BC', description: 'Mourning Jerusalem\'s destruction' },
  { bookNumber: 26, name: 'Ezekiel', abbr: 'EZE', testament: Testament.OLD, chapterCount: 48, bookOrder: 26, author: 'Ezekiel', dateWritten: '~593-571 BC', description: 'Visions of restoration' },
  { bookNumber: 27, name: 'Daniel', abbr: 'DAN', testament: Testament.OLD, chapterCount: 12, bookOrder: 27, author: 'Daniel', dateWritten: '~605-536 BC', description: 'Prophecy and faithfulness' },
  { bookNumber: 28, name: 'Hosea', abbr: 'HOS', testament: Testament.OLD, chapterCount: 14, bookOrder: 28, author: 'Hosea', dateWritten: '~750-710 BC', description: 'God\'s unfailing love' },
  { bookNumber: 29, name: 'Joel', abbr: 'JOE', testament: Testament.OLD, chapterCount: 3, bookOrder: 29, author: 'Joel', dateWritten: '~835-796 BC', description: 'Day of the Lord' },
  { bookNumber: 30, name: 'Amos', abbr: 'AMO', testament: Testament.OLD, chapterCount: 9, bookOrder: 30, author: 'Amos', dateWritten: '~760-750 BC', description: 'Justice and righteousness' },
  { bookNumber: 31, name: 'Obadiah', abbr: 'OBA', testament: Testament.OLD, chapterCount: 1, bookOrder: 31, author: 'Obadiah', dateWritten: '~586 BC', description: 'Judgment on Edom' },
  { bookNumber: 32, name: 'Jonah', abbr: 'JON', testament: Testament.OLD, chapterCount: 4, bookOrder: 32, author: 'Jonah', dateWritten: '~785-760 BC', description: 'God\'s mercy to Nineveh' },
  { bookNumber: 33, name: 'Micah', abbr: 'MIC', testament: Testament.OLD, chapterCount: 7, bookOrder: 33, author: 'Micah', dateWritten: '~735-710 BC', description: 'Who is like God?' },
  { bookNumber: 34, name: 'Nahum', abbr: 'NAH', testament: Testament.OLD, chapterCount: 3, bookOrder: 34, author: 'Nahum', dateWritten: '~663-654 BC', description: 'Nineveh\'s doom' },
  { bookNumber: 35, name: 'Habakkuk', abbr: 'HAB', testament: Testament.OLD, chapterCount: 3, bookOrder: 35, author: 'Habakkuk', dateWritten: '~612-588 BC', description: 'Living by faith' },
  { bookNumber: 36, name: 'Zephaniah', abbr: 'ZEP', testament: Testament.OLD, chapterCount: 3, bookOrder: 36, author: 'Zephaniah', dateWritten: '~635-625 BC', description: 'Day of judgment' },
  { bookNumber: 37, name: 'Haggai', abbr: 'HAG', testament: Testament.OLD, chapterCount: 2, bookOrder: 37, author: 'Haggai', dateWritten: '~520 BC', description: 'Rebuild the temple' },
  { bookNumber: 38, name: 'Zechariah', abbr: 'ZEC', testament: Testament.OLD, chapterCount: 14, bookOrder: 38, author: 'Zechariah', dateWritten: '~520-518 BC', description: 'Future restoration' },
  { bookNumber: 39, name: 'Malachi', abbr: 'MAL', testament: Testament.OLD, chapterCount: 4, bookOrder: 39, author: 'Malachi', dateWritten: '~430 BC', description: 'Final Old Testament message' },
  
  // New Testament
  { bookNumber: 40, name: 'Matthew', abbr: 'MAT', testament: Testament.NEW, chapterCount: 28, bookOrder: 40, author: 'Matthew', dateWritten: '~AD 60-65', description: 'Jesus as King' },
  { bookNumber: 41, name: 'Mark', abbr: 'MRK', testament: Testament.NEW, chapterCount: 16, bookOrder: 41, author: 'Mark', dateWritten: '~AD 55-65', description: 'Jesus as Servant' },
  { bookNumber: 42, name: 'Luke', abbr: 'LUK', testament: Testament.NEW, chapterCount: 24, bookOrder: 42, author: 'Luke', dateWritten: '~AD 60', description: 'Jesus as Man' },
  { bookNumber: 43, name: 'John', abbr: 'JHN', testament: Testament.NEW, chapterCount: 21, bookOrder: 43, author: 'John', dateWritten: '~AD 85-90', description: 'Jesus as God' },
  { bookNumber: 44, name: 'Acts', abbr: 'ACT', testament: Testament.NEW, chapterCount: 28, bookOrder: 44, author: 'Luke', dateWritten: '~AD 60-62', description: 'Early church history' },
  { bookNumber: 45, name: 'Romans', abbr: 'ROM', testament: Testament.NEW, chapterCount: 16, bookOrder: 45, author: 'Paul', dateWritten: '~AD 57', description: 'Righteousness through faith' },
  { bookNumber: 46, name: '1 Corinthians', abbr: '1CO', testament: Testament.NEW, chapterCount: 16, bookOrder: 46, author: 'Paul', dateWritten: '~AD 55', description: 'Church problems addressed' },
  { bookNumber: 47, name: '2 Corinthians', abbr: '2CO', testament: Testament.NEW, chapterCount: 13, bookOrder: 47, author: 'Paul', dateWritten: '~AD 55-56', description: 'Paul\'s ministry defended' },
  { bookNumber: 48, name: 'Galatians', abbr: 'GAL', testament: Testament.NEW, chapterCount: 6, bookOrder: 48, author: 'Paul', dateWritten: '~AD 49', description: 'Freedom in Christ' },
  { bookNumber: 49, name: 'Ephesians', abbr: 'EPH', testament: Testament.NEW, chapterCount: 6, bookOrder: 49, author: 'Paul', dateWritten: '~AD 60-62', description: 'Unity in Christ' },
  { bookNumber: 50, name: 'Philippians', abbr: 'PHP', testament: Testament.NEW, chapterCount: 4, bookOrder: 50, author: 'Paul', dateWritten: '~AD 61', description: 'Joy in Christ' },
  { bookNumber: 51, name: 'Colossians', abbr: 'COL', testament: Testament.NEW, chapterCount: 4, bookOrder: 51, author: 'Paul', dateWritten: '~AD 60-62', description: 'Supremacy of Christ' },
  { bookNumber: 52, name: '1 Thessalonians', abbr: '1TH', testament: Testament.NEW, chapterCount: 5, bookOrder: 52, author: 'Paul', dateWritten: '~AD 51', description: 'Christ\'s return' },
  { bookNumber: 53, name: '2 Thessalonians', abbr: '2TH', testament: Testament.NEW, chapterCount: 3, bookOrder: 53, author: 'Paul', dateWritten: '~AD 51-52', description: 'Day of the Lord' },
  { bookNumber: 54, name: '1 Timothy', abbr: '1TI', testament: Testament.NEW, chapterCount: 6, bookOrder: 54, author: 'Paul', dateWritten: '~AD 62-64', description: 'Instructions for church leaders' },
  { bookNumber: 55, name: '2 Timothy', abbr: '2TI', testament: Testament.NEW, chapterCount: 4, bookOrder: 55, author: 'Paul', dateWritten: '~AD 67', description: 'Paul\'s final words' },
  { bookNumber: 56, name: 'Titus', abbr: 'TIT', testament: Testament.NEW, chapterCount: 3, bookOrder: 56, author: 'Paul', dateWritten: '~AD 62-64', description: 'Church order on Crete' },
  { bookNumber: 57, name: 'Philemon', abbr: 'PHM', testament: Testament.NEW, chapterCount: 1, bookOrder: 57, author: 'Paul', dateWritten: '~AD 60', description: 'Appeal for a slave' },
  { bookNumber: 58, name: 'Hebrews', abbr: 'HEB', testament: Testament.NEW, chapterCount: 13, bookOrder: 58, author: 'Unknown', dateWritten: '~AD 64-68', description: 'Superiority of Christ' },
  { bookNumber: 59, name: 'James', abbr: 'JAS', testament: Testament.NEW, chapterCount: 5, bookOrder: 59, author: 'James', dateWritten: '~AD 44-49', description: 'Faith in action' },
  { bookNumber: 60, name: '1 Peter', abbr: '1PE', testament: Testament.NEW, chapterCount: 5, bookOrder: 60, author: 'Peter', dateWritten: '~AD 62-64', description: 'Suffering and glory' },
  { bookNumber: 61, name: '2 Peter', abbr: '2PE', testament: Testament.NEW, chapterCount: 3, bookOrder: 61, author: 'Peter', dateWritten: '~AD 67-68', description: 'False teachers' },
  { bookNumber: 62, name: '1 John', abbr: '1JN', testament: Testament.NEW, chapterCount: 5, bookOrder: 62, author: 'John', dateWritten: '~AD 85-95', description: 'God is love' },
  { bookNumber: 63, name: '2 John', abbr: '2JN', testament: Testament.NEW, chapterCount: 1, bookOrder: 63, author: 'John', dateWritten: '~AD 85-95', description: 'Walking in truth' },
  { bookNumber: 64, name: '3 John', abbr: '3JN', testament: Testament.NEW, chapterCount: 1, bookOrder: 64, author: 'John', dateWritten: '~AD 85-95', description: 'Hospitality commended' },
  { bookNumber: 65, name: 'Jude', abbr: 'JUD', testament: Testament.NEW, chapterCount: 1, bookOrder: 65, author: 'Jude', dateWritten: '~AD 65', description: 'Contend for the faith' },
  { bookNumber: 66, name: 'Revelation', abbr: 'REV', testament: Testament.NEW, chapterCount: 22, bookOrder: 66, author: 'John', dateWritten: '~AD 95', description: 'End times prophecy' },
];

// Sample verses for testing
const sampleVerses = [
  { bookName: 'Genesis', chapter: 1, verses: [
    { verseNumber: 1, text: 'In the beginning God created the heaven and the earth.', keywords: ['beginning', 'God', 'created', 'heaven', 'earth'] },
    { verseNumber: 2, text: 'And the earth was without form, and void; and darkness was upon the face of the deep. And the Spirit of God moved upon the face of the waters.', keywords: ['earth', 'void', 'darkness', 'Spirit', 'God', 'waters'] },
    { verseNumber: 3, text: 'And God said, Let there be light: and there was light.', keywords: ['God', 'light'] },
  ]},
  { bookName: 'John', chapter: 3, verses: [
    { verseNumber: 16, text: 'For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life.', keywords: ['God', 'loved', 'world', 'Son', 'believeth', 'everlasting', 'life'] },
    { verseNumber: 17, text: 'For God sent not his Son into the world to condemn the world; but that the world through him might be saved.', keywords: ['God', 'Son', 'world', 'condemn', 'saved'] },
  ]},
  { bookName: 'Psalms', chapter: 23, verses: [
    { verseNumber: 1, text: 'The Lord is my shepherd; I shall not want.', keywords: ['Lord', 'shepherd', 'want'] },
    { verseNumber: 2, text: 'He maketh me to lie down in green pastures: he leadeth me beside the still waters.', keywords: ['green', 'pastures', 'still', 'waters'] },
    { verseNumber: 3, text: 'He restoreth my soul: he leadeth me in the paths of righteousness for his name\'s sake.', keywords: ['restoreth', 'soul', 'paths', 'righteousness'] },
  ]},
];

// Symbol patterns for deeper analysis
const symbolPatterns = [
  { symbol: 'seven', category: 'number', meaning: 'Completeness, perfection, God\'s perfect number', occurrences: 735 },
  { symbol: 'twelve', category: 'number', meaning: 'Government, authority, God\'s people (12 tribes, 12 apostles)', occurrences: 187 },
  { symbol: 'forty', category: 'number', meaning: 'Testing, trial, probation (40 days/nights, 40 years)', occurrences: 146 },
  { symbol: 'three', category: 'number', meaning: 'Divine completeness, Trinity', occurrences: 467 },
  { symbol: 'lion', category: 'animal', meaning: 'Strength, courage, royalty, Christ as Lion of Judah', occurrences: 155 },
  { symbol: 'lamb', category: 'animal', meaning: 'Sacrifice, innocence, Christ as Lamb of God', occurrences: 178 },
  { symbol: 'serpent', category: 'animal', meaning: 'Deception, Satan, wisdom', occurrences: 88 },
  { symbol: 'dove', category: 'animal', meaning: 'Holy Spirit, peace, purity', occurrences: 46 },
  { symbol: 'white', category: 'color', meaning: 'Purity, righteousness, holiness', occurrences: 75 },
  { symbol: 'red', category: 'color', meaning: 'Blood, sacrifice, sin', occurrences: 53 },
  { symbol: 'purple', category: 'color', meaning: 'Royalty, wealth, luxury', occurrences: 48 },
  { symbol: 'gold', category: 'metal', meaning: 'Divinity, purity, kingship', occurrences: 419 },
  { symbol: 'silver', category: 'metal', meaning: 'Redemption, price', occurrences: 282 },
  { symbol: 'bronze', category: 'metal', meaning: 'Judgment, strength', occurrences: 133 },
  { symbol: 'water', category: 'element', meaning: 'Life, cleansing, Holy Spirit', occurrences: 722 },
  { symbol: 'fire', category: 'element', meaning: 'Holy Spirit, judgment, purification', occurrences: 549 },
  { symbol: 'bread', category: 'object', meaning: 'Life, provision, Christ as bread of life', occurrences: 361 },
  { symbol: 'wine', category: 'object', meaning: 'Joy, blood of Christ, new covenant', occurrences: 231 },
  { symbol: 'oil', category: 'object', meaning: 'Holy Spirit, anointing, consecration', occurrences: 193 },
  { symbol: 'salt', category: 'object', meaning: 'Preservation, covenant, wisdom', occurrences: 41 },
];

async function main() {
  console.log('🌱 Starting seed...');

  // Clean existing data
  console.log('🧹 Cleaning existing data...');
  await prisma.history.deleteMany();
  await prisma.favorite.deleteMany();
  await prisma.report.deleteMany();
  await prisma.verse.deleteMany();
  await prisma.book.deleteMany();
  await prisma.user.deleteMany();
  await prisma.symbolPattern.deleteMany();
  await prisma.crossReference.deleteMany();
  await prisma.cacheEntry.deleteMany();

  // Create test users
  console.log('👤 Creating test users...');
  const testUser = await prisma.user.create({
    data: {
      email: 'test@deeperbible.com',
      name: 'Test User',
    },
  });

  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@deeperbible.com',
      name: 'Admin User',
    },
  });

  // Create all Bible books
  console.log('📚 Creating Bible books...');
  const createdBooks = await Promise.all(
    bibleBooks.map(book => 
      prisma.book.create({
        data: book,
      })
    )
  );
  console.log(`✅ Created ${createdBooks.length} books`);

  // Create sample verses
  console.log('📝 Creating sample verses...');
  for (const verseData of sampleVerses) {
    const book = createdBooks.find(b => b.name === verseData.bookName);
    if (book) {
      for (const verse of verseData.verses) {
        await prisma.verse.create({
          data: {
            bookId: book.id,
            chapter: verseData.chapter,
            verseNumber: verse.verseNumber,
            text: verse.text,
            keywords: verse.keywords,
          },
        });
      }
    }
  }

  // Create symbol patterns
  console.log('🔍 Creating symbol patterns...');
  await Promise.all(
    symbolPatterns.map(pattern =>
      prisma.symbolPattern.create({
        data: {
          ...pattern,
          contexts: [],
        },
      })
    )
  );

  // Create sample reports
  console.log('📊 Creating sample reports...');
  const genesisBook = createdBooks.find(b => b.name === 'Genesis');
  if (genesisBook) {
    await prisma.report.create({
      data: {
        bookId: genesisBook.id,
        chapter: 1,
        verseStart: 1,
        verseEnd: 3,
        reportType: 'DEEPER_ANALYSIS',
        status: 'COMPLETED',
        content: {
          summary: 'Analysis of Genesis 1:1-3 - The Creation Account',
          themes: ['Creation', 'Divine Power', 'Light vs Darkness'],
          symbols: ['Light', 'Darkness', 'Spirit', 'Waters'],
          insights: [
            'The Hebrew word "bara" (created) implies creation ex nihilo',
            'The Spirit hovering over waters symbolizes divine presence',
            'Light as the first creative act establishes order from chaos',
          ],
        },
        rawContent: 'Deep theological analysis of the opening verses of Genesis...',
        userId: testUser.id,
        tokens: 1500,
        cost: 0.03,
        model: 'gpt-4-turbo',
        promptVersion: 'v1.0',
        confidence: 0.92,
        processingTime: 2500,
        completedAt: new Date(),
      },
    });
  }

  // Create sample cross-references
  console.log('🔗 Creating sample cross-references...');
  await prisma.crossReference.create({
    data: {
      sourceBook: 'Genesis',
      sourceChapter: 1,
      sourceVerse: 1,
      targetBook: 'John',
      targetChapter: 1,
      targetVerse: 1,
      relationship: 'parallels',
      confidence: 0.95,
    },
  });

  await prisma.crossReference.create({
    data: {
      sourceBook: 'Isaiah',
      sourceChapter: 53,
      sourceVerse: 5,
      targetBook: '1 Peter',
      targetChapter: 2,
      targetVerse: 24,
      relationship: 'quotes',
      confidence: 0.98,
    },
  });

  // Create sample favorites
  console.log('⭐ Creating sample favorites...');
  const johnBook = createdBooks.find(b => b.name === 'John');
  if (johnBook) {
    await prisma.favorite.create({
      data: {
        userId: testUser.id,
        bookId: johnBook.id,
        chapter: 3,
        verse: 16,
        notes: 'The gospel in a nutshell - God\'s love for humanity',
      },
    });
  }

  // Create sample history
  console.log('📜 Creating sample history...');
  await prisma.history.create({
    data: {
      userId: testUser.id,
      action: 'viewed',
      bookName: 'Genesis',
      chapter: 1,
      metadata: { timestamp: new Date().toISOString() },
    },
  });

  await prisma.history.create({
    data: {
      userId: testUser.id,
      action: 'analyzed',
      bookName: 'John',
      chapter: 3,
      verse: 16,
      metadata: { analysisType: 'DEEPER_ANALYSIS' },
    },
  });

  console.log('✅ Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });