/* eslint-disable no-console */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Post from './models/Post.js';
import SidebarItem from './models/SidebarItem.js';

// Load environment variables
dotenv.config();

const { MONGODB_URI } = process.env;

if (!MONGODB_URI) {
  console.error('Error: MONGODB_URI is not defined in .env file');
  process.exit(1);
}

// Sample posts to create
const samplePosts = [
  {
    title: 'Getting Started with React Hooks',
    category: 'JavaScript',
    body: '<h2>Introduction to React Hooks</h2><p>React Hooks revolutionized how we write React components. They allow you to use state and other React features without writing a class.</p><h3>useState Hook</h3><p>The useState hook is the most basic hook that lets you add state to functional components.</p><pre class="ql-syntax" spellcheck="false">const [count, setCount] = useState(0);\n\n// Update count\nsetCount(count + 1);\n</pre><p>This simple line gives you a state variable and a function to update it!</p><h3>useEffect Hook</h3><p>The useEffect hook lets you perform side effects in function components:</p><pre class="ql-syntax" spellcheck="false">useEffect(() => {\n  document.title = `Count: ${count}`;\n}, [count]);\n</pre><p>Start using hooks today! 🚀</p>',
    tags: ['#react', '#hooks', '#javascript'],
  },
  {
    title: 'Python Data Science Essentials',
    category: 'Python',
    body: '<h2>Data Science with Python</h2><p>Python has become the go-to language for data science. Libraries like <strong>NumPy</strong>, <strong>Pandas</strong>, and <strong>Matplotlib</strong> make it incredibly powerful.</p><h3>NumPy Basics</h3><p>NumPy provides support for large multi-dimensional arrays and matrices.</p><pre class="ql-syntax" spellcheck="false">import numpy as np\n\n# Create an array\narray = np.array([1, 2, 3, 4, 5])\n\n# Calculate mean\nmean = np.mean(array)\nprint(f"Mean: {mean}")\n</pre><h3>Pandas DataFrames</h3><p>Pandas makes data manipulation a breeze:</p><pre class="ql-syntax" spellcheck="false">import pandas as pd\n\n# Create a DataFrame\ndf = pd.DataFrame({\n    \'name\': [\'Alice\', \'Bob\', \'Charlie\'],\n    \'age\': [25, 30, 35]\n})\n\nprint(df.head())\n</pre><p>Start your data science journey today! 📊</p>',
    tags: ['#python', '#datascience', '#numpy', '#pandas'],
  },
  {
    title: 'CSS Grid Layout Masterclass',
    category: 'CSS & Design',
    body: '<h2>Mastering CSS Grid</h2><p>CSS Grid Layout is a <em>two-dimensional</em> layout system that makes creating complex layouts much easier.</p><h3>Basic Grid</h3><p>Create a simple grid container:</p><pre class="ql-syntax" spellcheck="false">.container {\n  display: grid;\n  grid-template-columns: repeat(3, 1fr);\n  gap: 20px;\n}\n\n.item {\n  background: #f0f0f0;\n  padding: 20px;\n  border-radius: 8px;\n}\n</pre><h3>Grid Areas</h3><p>Define named grid areas for semantic layouts:</p><pre class="ql-syntax" spellcheck="false">.layout {\n  display: grid;\n  grid-template-areas:\n    "header header header"\n    "sidebar main main"\n    "footer footer footer";\n}\n\n.header { grid-area: header; }\n.sidebar { grid-area: sidebar; }\n.main { grid-area: main; }\n.footer { grid-area: footer; }\n</pre><p>Grid changed the way we build responsive layouts! 🎨</p>',
    tags: ['#css', '#grid', '#layout', '#responsive'],
  },
  {
    title: 'Docker Containers 101',
    category: 'DevOps',
    body: '<h2>Introduction to Docker</h2><p>Docker is a platform for developing, shipping, and running applications in <strong>containers</strong>.</p><h3>Your First Container</h3><p>Run your first Docker container:</p><pre class="ql-syntax" spellcheck="false"># Pull and run nginx\ndocker run -d -p 80:80 nginx\n\n# List running containers\ndocker ps\n\n# Stop a container\ndocker stop &lt;container_id&gt;\n</pre><h3>Dockerfile Example</h3><p>Create a custom Docker image:</p><pre class="ql-syntax" spellcheck="false">FROM node:18-alpine\n\nWORKDIR /app\n\nCOPY package*.json ./\nRUN npm install\n\nCOPY . .\n\nEXPOSE 3000\nCMD ["npm", "start"]\n</pre><p>Containers make deployment consistent across environments. 🐳</p>',
    tags: ['#docker', '#devops', '#containers', '#deployment'],
  },
];

async function seedDatabase() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected successfully!');

    // Clear existing data
    console.log('Clearing existing sidebar items...');
    await SidebarItem.deleteMany({});

    // Create posts and sidebar items
    console.log('Creating posts and sidebar items...');
    
    for (const postData of samplePosts) {
      // Create post
      const post = new Post(postData);
      await post.save();
      console.log(`Created post: ${post.title}`);

      // Create corresponding sidebar item
      const sidebarItem = new SidebarItem({
        title: post.title,
        category: post.category,
        icon: '📄',
        postId: post._id,
        order: 0,
      });
      await sidebarItem.save();
      console.log(`Created sidebar item for: ${post.title}`);
    }

    console.log('\n✅ Database seeded successfully!');
    console.log(`Created ${samplePosts.length} posts and sidebar items`);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
}

seedDatabase();
