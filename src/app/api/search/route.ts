import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import cosineSimilarity from 'cosine-similarity';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Sample book data - in a real app, this would come from a database
// For demo purposes, we'll use a curated set of popular Gutenberg books
const SAMPLE_BOOKS = [
  {
    id: '1',
    title: 'Macbeth',
    author: 'William Shakespeare',
    description: 'A tragedy about a Scottish general who receives a prophecy from three witches that he will become King of Scotland. The play explores themes of ambition, guilt, and the corrupting influence of power.',
    gutenbergId: '1533',
    embedding: null as number[] | null
  },
  {
    id: '2',
    title: 'Hamlet',
    author: 'William Shakespeare',
    description: 'The tragedy of Prince Hamlet of Denmark, who seeks revenge against his uncle Claudius for murdering his father and marrying his mother. A profound exploration of madness, mortality, and moral corruption.',
    gutenbergId: '1524',
    embedding: null as number[] | null
  },
  {
    id: '3',
    title: 'Pride and Prejudice',
    author: 'Jane Austen',
    description: 'A romantic novel about Elizabeth Bennet and her relationship with the proud Mr. Darcy. Set in Regency England, it explores themes of love, class, and social expectations.',
    gutenbergId: '1342',
    embedding: null as number[] | null
  },
  {
    id: '4',
    title: 'The Adventures of Sherlock Holmes',
    author: 'Arthur Conan Doyle',
    description: 'A collection of twelve detective stories featuring the brilliant detective Sherlock Holmes and his loyal friend Dr. Watson. Classic mysteries set in Victorian London.',
    gutenbergId: '1661',
    embedding: null as number[] | null
  },
  {
    id: '5',
    title: 'Alice\'s Adventures in Wonderland',
    author: 'Lewis Carroll',
    description: 'A fantastical tale about a young girl named Alice who falls down a rabbit hole into a magical world filled with talking animals, mad tea parties, and the Queen of Hearts.',
    gutenbergId: '11',
    embedding: null as number[] | null
  },
  {
    id: '6',
    title: 'Treasure Island',
    author: 'Robert Louis Stevenson',
    description: 'An adventure novel about young Jim Hawkins who finds a treasure map and sets sail with pirates in search of buried treasure. A classic tale of adventure on the high seas.',
    gutenbergId: '120',
    embedding: null as number[] | null
  },
  {
    id: '7',
    title: 'The Picture of Dorian Gray',
    author: 'Oscar Wilde',
    description: 'A philosophical novel about a young man who remains eternally youthful while his portrait ages and reflects his moral corruption. Explores themes of beauty, morality, and the price of eternal youth.',
    gutenbergId: '174',
    embedding: null as number[] | null
  },
  {
    id: '8',
    title: 'Dracula',
    author: 'Bram Stoker',
    description: 'An epistolary novel about Count Dracula\'s attempt to move from Transylvania to England to spread the vampire curse. A foundational work of vampire literature and Gothic horror.',
    gutenbergId: '345',
    embedding: null as number[] | null
  },
  {
    id: '9',
    title: 'The Time Machine',
    author: 'H.G. Wells',
    description: 'A science fiction novel about an inventor who creates a machine that allows him to travel through time. He journeys to the year 802,701 and discovers a divided human society.',
    gutenbergId: '35',
    embedding: null as number[] | null
  },
  {
    id: '10',
    title: 'The Scarlet Letter',
    author: 'Nathaniel Hawthorne',
    description: 'A novel set in Puritan Massachusetts about Hester Prynne, who is forced to wear a scarlet letter A for adultery. Explores themes of sin, guilt, and redemption in colonial America.',
    gutenbergId: '33',
    embedding: null as number[] | null
  },
  {
    id: '11',
    title: 'Wuthering Heights',
    author: 'Emily Brontë',
    description: 'A gothic novel about the passionate and destructive love between Catherine Earnshaw and Heathcliff. Set on the Yorkshire moors, it explores themes of love, revenge, and social class.',
    gutenbergId: '768',
    embedding: null as number[] | null
  },
  {
    id: '12',
    title: 'The Count of Monte Cristo',
    author: 'Alexandre Dumas',
    description: 'An adventure novel about Edmond Dantès, who is wrongfully imprisoned and escapes to seek revenge against those who betrayed him. A tale of justice, revenge, and redemption.',
    gutenbergId: '1184',
    embedding: null as number[] | null
  },
  {
    id: '13',
    title: 'Frankenstein',
    author: 'Mary Shelley',
    description: 'A gothic novel about Victor Frankenstein, a scientist who creates a sapient creature in an unorthodox scientific experiment. Explores themes of creation, responsibility, and the nature of humanity.',
    gutenbergId: '84',
    embedding: null as number[] | null
  },
  {
    id: '14',
    title: 'The Adventures of Tom Sawyer',
    author: 'Mark Twain',
    description: 'A novel about a young boy growing up along the Mississippi River in the 1840s. Follows Tom\'s adventures with his friend Huckleberry Finn and explores themes of childhood, freedom, and American life.',
    gutenbergId: '74',
    embedding: null as number[] | null
  },
  {
    id: '15',
    title: 'Jane Eyre',
    author: 'Charlotte Brontë',
    description: 'A gothic romance about Jane Eyre, an orphan who becomes a governess and falls in love with her employer Mr. Rochester. Explores themes of love, independence, and social class in Victorian England.',
    gutenbergId: '1260',
    embedding: null as number[] | null
  }
];

// Generate embeddings for books if they don't exist
async function generateBookEmbeddings() {
  for (const book of SAMPLE_BOOKS) {
    if (!book.embedding) {
      try {
        const textToEmbed = `${book.title} by ${book.author}. ${book.description}`;
        const response = await openai.embeddings.create({
          model: 'text-embedding-3-small',
          input: textToEmbed,
        });
        book.embedding = response.data[0].embedding;
      } catch (error) {
        console.error(`Error generating embedding for ${book.title}:`, error);
      }
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const { query } = await request.json();

    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'Query is required and must be a string' },
        { status: 400 }
      );
    }

    // Check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }

    // Generate embeddings for books if needed
    await generateBookEmbeddings();

    // Generate embedding for the search query
    const queryResponse = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: query,
    });

    const queryEmbedding = queryResponse.data[0].embedding;

    // Calculate similarity scores
    const results = SAMPLE_BOOKS
      .filter(book => book.embedding) // Only include books with embeddings
      .map(book => ({
        ...book,
        similarity: cosineSimilarity(queryEmbedding, book.embedding!)
      }))
      .sort((a, b) => b.similarity - a.similarity) // Sort by similarity (highest first)
      .slice(0, 10) // Limit to top 10 results
      .map(({ embedding, ...book }) => book); // Remove embedding from response

    return NextResponse.json({ results });

  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
