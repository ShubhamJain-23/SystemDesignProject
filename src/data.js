// In-memory data store reflecting Slide 5 & 6 (MySQL profiles/connections + Cassandra posts/messages + Redis cache)

const members = [
  {
    id: "usr_101",
    name: "Shubham Jain",
    headline: "System Architect & DevOps Engineer | 7th Sem",
    company: "Tech Systems Inc.",
    location: "Bengaluru, India",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
    connectionsCount: 524,
    followersCount: 1420,
    about: "Passionate about high-throughput distributed systems, Kafka fan-out pipelines, and automated cloud CI/CD deployments.",
    skills: ["System Design", "Docker", "Kubernetes", "CI/CD", "Node.js", "Kafka", "Cassandra"]
  },
  {
    id: "usr_102",
    name: "Satya Nadella",
    headline: "Chairman and CEO at Microsoft",
    company: "Microsoft",
    location: "Redmond, Washington",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
    connectionsCount: 10000000,
    followersCount: 10500000,
    about: "Empowering every person and every organization on the planet to achieve more.",
    skills: ["Cloud Computing", "AI", "Leadership", "Transformation"]
  },
  {
    id: "usr_103",
    name: "Dr. Arvind Krishna",
    headline: "Chairman and CEO at IBM",
    company: "IBM",
    location: "Armonk, New York",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80",
    connectionsCount: 850000,
    followersCount: 1200000,
    about: "Leading hybrid cloud and quantum computing initiatives.",
    skills: ["Hybrid Cloud", "Quantum", "AI", "Enterprise Architecture"]
  },
  {
    id: "usr_104",
    name: "Priya Sharma",
    headline: "Staff Site Reliability Engineer | Distributed Systems",
    company: "CloudNative Labs",
    location: "Bengaluru, India",
    avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80",
    connectionsCount: 1230,
    followersCount: 3400,
    about: "Building resilient microservices, zero-downtime pipelines, and observability stacks.",
    skills: ["SRE", "Terraform", "Prometheus", "Docker", "Vercel"]
  }
];

let posts = [
  {
    id: "post_001",
    authorId: "usr_102",
    content: "Excited to share our latest breakthroughs in distributed AI infrastructure. Scaling from millions to billions of parameters requires tight hardware-software co-design and resilient networking.",
    imageUrl: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&auto=format&fit=crop&q=80",
    likesCount: 1420,
    commentsCount: 230,
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    isCelebrity: true
  },
  {
    id: "post_002",
    authorId: "usr_104",
    content: "Just finalized our Part B System Design & DevOps assignment! 🚀 Automated CI/CD pipeline triggers on every push, runs unit & integration tests, validates Docker build, and deploys live to Vercel.",
    imageUrl: "https://images.unsplash.com/photo-1618401471353-b98afee0b2eb?w=800&auto=format&fit=crop&q=80",
    likesCount: 94,
    commentsCount: 18,
    createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
    isCelebrity: false
  },
  {
    id: "post_003",
    authorId: "usr_101",
    content: "Slide 8 Bottleneck insight: Celebrity fan-out (users with >10K followers) switches from push-based timeline generation to hybrid pull-and-merge. This prevents write amplification during peak traffic!",
    imageUrl: null,
    likesCount: 67,
    commentsCount: 9,
    createdAt: new Date(Date.now() - 3600000 * 8).toISOString(),
    isCelebrity: false
  }
];

let connectionRequests = [
  {
    id: "req_201",
    fromId: "usr_103",
    toId: "usr_101",
    status: "PENDING",
    createdAt: new Date(Date.now() - 3600000 * 12).toISOString()
  }
];

let conversations = [
  {
    id: "conv_301",
    participants: ["usr_101", "usr_104"],
    messages: [
      {
        id: "msg_401",
        senderId: "usr_104",
        text: "Hey Shubham! How did the Docker container and Vercel CI/CD setup go?",
        createdAt: new Date(Date.now() - 3600000 * 1).toISOString()
      },
      {
        id: "msg_402",
        senderId: "usr_101",
        text: "Works smoothly! Tested automated GitHub Actions workflow and verified health checks.",
        createdAt: new Date(Date.now() - 3600000 * 0.5).toISOString()
      }
    ]
  }
];

module.exports = {
  members,
  posts,
  connectionRequests,
  conversations
};
