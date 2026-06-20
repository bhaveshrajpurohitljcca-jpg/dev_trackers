export interface SuggestedProject {
  level: number;
  title: string;
  description: string;
  challenges: string[];
}

export const SUGGESTED_PROJECTS: Record<string, Record<string, SuggestedProject[]>> = {
  "Backend Team": {
    "Python": [
      {
        level: 1,
        title: "Smart Calculator",
        description: "Ek menu-driven calculator banao jahan user operation select kare: Addition, Subtraction, Multiplication, Division, ya Exit. Program tab tak chalta rahe jab tak user Exit na kare.",
        challenges: ["Multiple numbers add karna", "Division by zero handle karna", "Last answer history dikhana"]
      },
      {
        level: 2,
        title: "Number Guessing Game",
        description: "Computer ek secret number choose karega. User repeatedly guess karega aur program hints dega (Too High, Too Low, Correct). Game ke end me total attempts bhi dikhane hain.",
        challenges: ["Difficulty levels", "Limited attempts mode", "High score system"]
      },
      {
        level: 3,
        title: "Student Marks Analyzer",
        description: "Teacher ki tarah students ke marks manage karne wala program. Features: Student add karna, Marks add karna, Saare students dekhna, Highest marks wala student, aur Average marks.",
        challenges: ["Grade system", "Subject-wise marks", "Failed students list"]
      },
      {
        level: 4,
        title: "Expense Tracker",
        description: "Daily kharche record karne wala program (e.g. Food: 100, Travel: 50, Shopping: 500). Features: Expense add, Total expense, Category-wise expense, aur All expenses display.",
        challenges: ["Daily report", "Monthly report", "Budget warning"]
      },
      {
        level: 5,
        title: "Contact Book",
        description: "Phone contacts manage karne wala system. Features: Add contact, Search contact, Update contact, Delete contact, aur View all contacts.",
        challenges: ["Duplicate contacts detect karna", "Name se partial search", "Favorite contacts"]
      },
      {
        level: 6,
        title: "Inventory Management System",
        description: "Ek choti stationery shop ka stock management system (e.g. Pen = 50, Notebook = 20, Bottle = 10). Features: Add item, Remove item, Update quantity, aur Show inventory.",
        challenges: ["Low stock alert", "Total inventory value", "Purchase history"]
      },
      {
        level: 7,
        title: "Library Management System",
        description: "Library me books manage karne wala software. Features: Add book, Search book, Issue book, Return book, aur View available books.",
        challenges: ["Due date system", "Fine calculation", "Multiple users"]
      },
      {
        level: 8,
        title: "Banking System",
        description: "Bank account simulation. Features: Create account, Deposit money, Withdraw money, Check balance, aur Transaction history.",
        challenges: ["Savings account", "Current account", "Transfer money"]
      },
      {
        level: 9,
        title: "Multi User Task Manager",
        description: "Har user apni task list maintain kar sake. Features: Register user, Login, Create task, Complete task, Delete task, aur View pending tasks.",
        challenges: ["Priority system", "Deadlines", "Search tasks"]
      },
      {
        level: 10,
        title: "Mini Operating System Simulator",
        description: "Console ke andar ek fake operating system. User commands type kare (e.g. create file, delete file, rename file, show files, open file). Program command-line jaisa feel dena chahiye (e.g. MyOS >).",
        challenges: ["Folder system", "User accounts", "Permission system"]
      },
      {
        level: 11,
        title: "Chat Application Simulator",
        description: "WhatsApp ka simplified console version. Features: User create karo, User login karo, Message bhejo, Inbox dekho, aur Sent messages dekho.",
        challenges: ["Group chat", "Message search", "Online/offline status"]
      }
    ],
    "FastAPI": [
      {
        level: 1,
        title: "Hello API",
        description: "Ek simple API banao with endpoints: GET /, GET /about, aur GET /contact. Har endpoint alag JSON response return kare.",
        challenges: ["Query parameters add karo", "Different status codes return karo"]
      },
      {
        level: 2,
        title: "Student API",
        description: "Student records memory me store karne wali API with: GET Students, POST Student, PUT Student, aur DELETE Student. Browser ke bajaye API client ki tarah sochna start karein.",
        challenges: ["Student search", "Student count endpoint"]
      },
      {
        level: 3,
        title: "Book Management API",
        description: "Library books manage karne wali CRUD API (Add, View, Update, Delete). Har book ka schema: id, title, author, price.",
        challenges: ["Verify book availability", "Filter by author/price"]
      },
      {
        level: 4,
        title: "Expense Tracker API",
        description: "Expense tracking backend with Add, View, Delete, and Total Expense features. Category-wise expense report (Food, Travel, Shopping) bhi mile.",
        challenges: ["Filter by category", "Add daily limit validation"]
      },
      {
        level: 5,
        title: "Notes API",
        description: "Personal notes management system. Features: Create Note, Update Note, Delete Note, aur View Notes. Note schema: Title, Content, and Created Date.",
        challenges: ["Search notes by keywords", "Filter notes by date range"]
      },
      {
        level: 6,
        title: "Employee Management API",
        description: "Company employee records manage karne wala backend with Employee CRUD, Department Assignment, aur Salary Data. Large and organized APIs learning project.",
        challenges: ["Department-wise filtering", "Employee statistics"]
      },
      {
        level: 7,
        title: "File Sharing API",
        description: "User files (PDF, Image, Document) upload kar sake, view, aur delete kar sake.",
        challenges: ["File size validation", "File type validation"]
      },
      {
        level: 8,
        title: "Authentication System",
        description: "User registration aur login system with Register, Login, Profile, aur Logout. Protected routes setup karein jisme authenticated users hi profile access kar sakein.",
        challenges: ["Role system", "Admin-only routes"]
      },
      {
        level: 9,
        title: "Real-Time Chat Backend",
        description: "WebSocket based chat server where multiple users connect, send, and receive messages in real time.",
        challenges: ["Display active user names", "Private messages", "Multiple chat rooms"]
      },
      {
        level: 10,
        title: "Team Task Management Backend",
        description: "Trello/Asana style backend. Features: User Registration, Authentication, Projects, Tasks (Pending, In Progress, Completed), Task Assignment, Comments, and File Upload.",
        challenges: ["Real-time notifications using WebSockets", "Detailed activity logs", "Team permissions"]
      },
      {
        level: 11,
        title: "College ERP Backend",
        description: "College management backend with Students, Faculty, Courses, Attendance, Assignments, and Notices. Requires auth, file upload, roles, and WS notice broadcast.",
        challenges: ["Grade calculation logic", "Semester transition helper", "Detailed performance report generator"]
      }
    ]
  },
  "Database Team": {
    "SQL": [
      {
        level: 1,
        title: "Student Database",
        description: "Ek simple student database database banao. Tables: Students (id, name, age, city). Operations: Add Student, Update Student, Delete Student, aur View Students.",
        challenges: ["Filter students by city", "Average age calculation"]
      },
      {
        level: 2,
        title: "Employee Records System",
        description: "Company employees ka database. Table: Employees (id, name, department, salary). Queries write karein: Highest Salary, Lowest Salary, and Employees by Department.",
        challenges: ["Group by department with count", "Average salary per department"]
      },
      {
        level: 3,
        title: "Product Inventory Database",
        description: "Shop ke products store karne wala database. Table: Products (id, name, price, quantity, category). Queries: Under 500, Out of stock, and Most expensive products.",
        challenges: ["Total stock value query", "Search by partial name"]
      },
      {
        level: 4,
        title: "Movie Collection Database",
        description: "Movies track karne ka system. Table: Movies (title, genre, rating, year). Queries: Top Rated, Latest Movies, and Movies by Genre.",
        challenges: ["Average rating by genre", "Filter by ratings range"]
      },
      {
        level: 5,
        title: "Library Database",
        description: "Library database with multiple tables: Books, Members. Track book issue and return records.",
        challenges: ["List of members with overdue books", "Search available books count"]
      },
      {
        level: 6,
        title: "Online Store Database",
        description: "Mini e-commerce database with Customers, Products, and Orders tables. Write queries for: Customer Orders, Order History, and Popular Products.",
        challenges: ["Total sales revenue", "Top spending customers list"]
      },
      {
        level: 7,
        title: "College Management Database",
        description: "College data tables: Students, Courses, Faculty, Enrollments. Properly establish Foreign Keys. Queries: Students in Course, Course Enrollments, Faculty Courses.",
        challenges: ["Count of courses per faculty", "Find students with zero enrollments"]
      },
      {
        level: 8,
        title: "Banking Database",
        description: "Bank backend database with Customers, Accounts, Transactions. Keep Deposit, Withdrawal, and Transfer records.",
        challenges: ["Transaction history for specific account", "Daily total volume audit query"]
      },
      {
        level: 9,
        title: "Food Delivery Database",
        description: "Food delivery app schema: Users, Restaurants, MenuItems, Orders, OrderItems. Write queries for: Top Restaurants, Most Ordered Items, and Customer Order History.",
        challenges: ["Average order value per user", "Active delivery riders status"]
      },
      {
        level: 10,
        title: "Project Management Database",
        description: "Trello/Asana style database. Tables: Users, Projects, Tasks, Comments, Attachments. Queries: Project Progress, Pending Tasks, Tasks per User, Completed Tasks.",
        challenges: ["Task completion timeline analysis", "Percentage completion calculation query"]
      },
      {
        level: 11,
        title: "Hospital Management Database",
        description: "Complete hospital database. Tables: Patients, Doctors, Appointments, Departments, Medicines, Bills. Queries: Doctor Schedule, Patient History, Revenue Reports, Department Statistics.",
        challenges: ["Top visited doctor per month", "Pharmacy stock depletion alerts", "Generate unpaid bills list"]
      }
    ],
    "PostgreSQL": [
      {
        level: 1,
        title: "Personal Notes Database",
        description: "Database for notes storage. Requirements: Multiple Notes, Created/Updated Date, and Categories. Focus on PG installation, db creation, and table creation.",
        challenges: ["Set default timestamp triggers", "Search notes index"]
      },
      {
        level: 2,
        title: "Expense Management Database",
        description: "Personal expense tracking database. Tables: Expenses, Categories. Track category-wise expenses, monthly reports, and expense history.",
        challenges: ["Add foreign key constraints", "Enforce positive value checks"]
      },
      {
        level: 3,
        title: "Library Database",
        description: "Library books and members management. Tables: Books, Members, IssuedBooks. Design features: Issue Book, Return Book, Book History with clean relationships.",
        challenges: ["Set cascade deletes on inactive members", "Index book names"]
      },
      {
        level: 4,
        title: "Inventory Management Database",
        description: "Shop inventory database. Tables: Products, Suppliers, StockHistory. Track stock updates, low stock tracking, and supplier records.",
        challenges: ["Stock trigger warning when quantity < 5", "Purchase history join analysis"]
      },
      {
        level: 5,
        title: "College Database",
        description: "College management database. Tables: Students, Courses, Faculty, Enrollments. Establish clean enrollment records and faculty course assignment. Schema design is key.",
        challenges: ["Ensure unique constraint on composite keys", "Database views for student counts"]
      },
      {
        level: 6,
        title: "Banking Database",
        description: "Bank account database. Tables: Customers, Accounts, Transactions. Handle Deposit, Withdraw, Transfer, and Transaction History with strict transaction safety checks.",
        challenges: ["Enforce CHECK constraints on negative balances", "Create transaction rollback handlers"]
      },
      {
        level: 7,
        title: "E-Commerce Database",
        description: "Online store database. Tables: Users, Products, Orders, OrderItems, Payments. Handle Order History, Payments, and Product Tracking. Add database indexes.",
        challenges: ["Add composite indexes for search optimization", "Enforce serial constraints on orders"]
      },
      {
        level: 8,
        title: "Food Delivery Database",
        description: "Food delivery application database. Tables: Users, Restaurants, MenuItems, Orders, DeliveryPartners. Track orders, deliveries, and restaurants.",
        challenges: ["Write postgis geographic distance triggers", "Define partition tables by month"]
      },
      {
        level: 9,
        title: "Project Management Database",
        description: "Team collaboration database. Tables: Users, Projects, Tasks, Comments, Files. Track task assignment, project progress, and activities. Optimize performance.",
        challenges: ["Use explain analyze on complex queries", "Establish dynamic materialized views"]
      },
      {
        level: 10,
        title: "Production Ready SaaS Database",
        description: "Complete SaaS CRM/ERP/learning database. Must support: Users, Roles, Permissions, Audit Logs, Activity History, and Notifications. Database is the backbone of the application.",
        challenges: ["Multi-tenant schema segregation", "Row-level security implementation"]
      },
      {
        level: 11,
        title: "Disaster Recovery Lab",
        description: "Perform DB administration on an existing database: full backup, restore, data verification, failure simulation, and recovery under 5 minutes.",
        challenges: ["Write automated bash backup cron scripts", "Simulate server crash recovery validation"]
      }
    ]
  },
  "Frontend Team": {
    "HTML": [
      {
        level: 1,
        title: "Personal Profile Page",
        description: "Apna personal profile page banao with Name, Photo, About Me, Skills, Hobbies, and Contact Info. pure HTML layout.",
        challenges: ["Use all text formatting tags", "Add email/social links anchors"]
      },
      {
        level: 2,
        title: "Resume Page",
        description: "Resume to HTML page conversion. Sections: Personal Info, Education, Skills, Projects, Achievements. Print-friendly structure.",
        challenges: ["Create structured definition lists", "Use tables for educational info"]
      },
      {
        level: 3,
        title: "College Information Website",
        description: "Apne college ki information website. Create pages: Home, About College, Courses, Faculty, and Contact, connecting them with HTML anchor links.",
        challenges: ["Use iframe to embed college map location", "Create navigation lists"]
      },
      {
        level: 4,
        title: "Restaurant Menu Website",
        description: "Restaurant ka digital menu. Sections: Starters, Main Course, Desserts, Beverages. Har item ke saath image aur price setup karein.",
        challenges: ["Use details/summary tags for accordion effect", "Use semantic menu lists"]
      },
      {
        level: 5,
        title: "Student Registration Form",
        description: "Admission form page. Fields: Name, Email, Phone, Gender, Course, Address. Properly structured fields.",
        challenges: ["Add input validation regex patterns", "Add select dropdowns and radio buttons"]
      },
      {
        level: 6,
        title: "Event Registration Website",
        description: "Hackathon/Event registration page detailing Event Details, Rules, Schedule, and Registration Form.",
        challenges: ["Add file upload input for ID cards", "Organize form fields using fieldset and legend"]
      },
      {
        level: 7,
        title: "Online Course Website",
        description: "Course showcase website with Courses, Instructors, Course Details, and Student Reviews tables.",
        challenges: ["Use semantic tags (<main>, <section>, <article>)", "Create multi-row review grids using tables"]
      },
      {
        level: 8,
        title: "News Portal",
        description: "News website structure with sections: Latest News, Technology, Sports, Education, Trending. Heavy use of HTML5 semantic tags.",
        challenges: ["Create multi-column news layout using sections", "Embed media elements (<audio>, <video>)"]
      },
      {
        level: 9,
        title: "Hospital Management Website Layout",
        description: "Hospital website structure. Pages: Home, Doctors, Departments, Appointments, Contact. Include appointment form.",
        challenges: ["Link appointment calendar picker input", "Structure hospital department charts"]
      },
      {
        level: 10,
        title: "Mini E-Commerce Website Structure",
        description: "Amazon/Flipkart simplified HTML version. Pages: Home, Products, Product Details, Cart, Checkout, Contact. Structure products, prices, and forms.",
        challenges: ["Use input type range/number for quantity filters", "Use nested details lists for hierarchy"]
      },
      {
        level: 11,
        title: "College ERP Frontend Structure",
        description: "College ERP pure HTML prototype. Modules: Student Dashboard, Attendance, Assignments, Courses, Faculty, Results, Profile. Link all pages.",
        challenges: ["Create tab navigation structures using links", "Display detailed progress stats using HTML5 <progress> tags"]
      }
    ],
    "CSS": [
      {
        level: 1,
        title: "Personal Profile Page Styling",
        description: "Apne HTML Profile Page ko professional look do using colors, fonts, margin, padding, and borders.",
        challenges: ["Add circular border-radius on profile photo", "Use custom google fonts for titles"]
      },
      {
        level: 2,
        title: "Modern Resume Page",
        description: "Resume page ko styling through typography and spacing. Layout clean and readable.",
        challenges: ["Add dual column sidebar look", "Apply clean hover animation on links"]
      },
      {
        level: 3,
        title: "Restaurant Menu Design",
        description: "Restaurant menu ko visually appealing card-style layout design dena.",
        challenges: ["Add glassmorphism background borders", "Use flexbox to align prices to right"]
      },
      {
        level: 4,
        title: "Event Registration Page",
        description: "Hackathon registration page form styling and hero section layout.",
        challenges: ["Style form input active states", "Add linear gradient background colors"]
      },
      {
        level: 5,
        title: "Product Showcase Page",
        description: "Single product landing page. Sections: Product Image, Features, Pricing, Buy Button, and Reviews.",
        challenges: ["Create glowing CTA button", "Add slide-in text transitions"]
      },
      {
        level: 6,
        title: "Multi-Section Company Website",
        description: "Company website homepage with Navbar, Hero Section, Services, About, Testimonials, and Footer. Use Flexbox.",
        challenges: ["Sticky header transition", "Responsive flex wrap elements for mobile screen compatibility"]
      },
      {
        level: 7,
        title: "News Website Layout",
        description: "News portal grid layout homepage. Sections: Top Stories, Trending News, Categories, Sidebar, and Footer.",
        challenges: ["Create grid card overlays", "Implement sidebar dynamic flex layout sizing"]
      },
      {
        level: 8,
        title: "College Management Website",
        description: "College website styling (Home, Courses, Faculty, Gallery, Contact) maintaining consistent style.",
        challenges: ["CSS variables setup for color palette", "Hover card growth animation"]
      },
      {
        level: 9,
        title: "Mini E-Commerce Frontend",
        description: "Shopping website responsive UI with Product Cards, Cart, and Checkout pages.",
        challenges: ["Implement CSS Grid columns", "Custom toggle selector buttons styling"]
      },
      {
        level: 10,
        title: "SaaS Dashboard UI",
        description: "Professional dashboard layout: Sidebar, Top Navbar, Statistics Cards, Charts Placeholder, Activity Section, Profile Area. Responsive CSS.",
        challenges: ["Add CSS animations for notifications drop", "Theme variables implementation (dark/light toggles)"]
      },
      {
        level: 11,
        title: "Trello Style Project Management UI",
        description: "Trello/Asana inspired interface containing Sidebar, Boards, Columns, Task Cards, and Profile section. Desktop/mobile responsive adjustment.",
        challenges: ["Dynamic flex scroll on tasks board columns", "Custom scrollbars design using webkit css rules"]
      }
    ],
    "JavaScript": [
      {
        level: 1,
        title: "Smart Calculator",
        description: "Calculator jahan user numbers enter kare aur result instantly page reload ke bina dekhe (Addition, Subtraction, Multiplication, Division).",
        challenges: ["Display calculation steps", "Error prompts on invalid division"]
      },
      {
        level: 2,
        title: "To-Do List",
        description: "Dynamic list UI update task management app (Add, Delete, Mark Complete, and View All Tasks).",
        challenges: ["Localstorage integration to persist data", "Filter tasks by active/completed status"]
      },
      {
        level: 3,
        title: "Student Marks Manager",
        description: "Add students and marks in JavaScript arrays/objects and dynamically update list metrics (Average, Highest Marks).",
        challenges: ["Sort students list dynamically", "Calculate grade letters from average scores"]
      },
      {
        level: 4,
        title: "Expense Tracker",
        description: "Add, delete, categorise expenses, and calculate total spending dynamically without reload.",
        challenges: ["Plot category ratios using pure CSS heights", "Enforce monthly budget overflow warnings"]
      },
      {
        level: 5,
        title: "Quiz Application",
        description: "Multiple choice quiz flow using next buttons. Score calculations, timer indicators, and final results view.",
        challenges: ["Randomize question order", "Add score penalty on late responses"]
      },
      {
        level: 6,
        title: "Movie Search App",
        description: "Search bar, movie cards, and movie details layout. Fetch movie data from an API and update UI dynamically.",
        challenges: ["Debounce user input search keypress events", "Handle network fetch error displays"]
      },
      {
        level: 7,
        title: "Weather Application",
        description: "Fetch weather info (temp, wind, humidity, climate) from an external weather API based on user input city name.",
        challenges: ["Change background graphics depending on weather", "Include auto location locator GPS hook"]
      },
      {
        level: 8,
        title: "Notes Application",
        description: "Notes management dashboard (Create, Edit, Delete, Search) using arrays state and instant DOM updates.",
        challenges: ["Rich text content editing options", "Color tag labels categorization"]
      },
      {
        level: 9,
        title: "Kanban Board",
        description: "Trello-style columns (To Do, In Progress, Completed) with task creation, deletion, and state shifting logic.",
        challenges: ["Drag and drop items natively using HTML5 API", "Persistent columns layout in local storage"]
      },
      {
        level: 10,
        title: "Project Management Dashboard",
        description: "Dashboard layout consuming REST APIs, performing dynamic sorting/filtering, and complex local state updates.",
        challenges: ["JWT authentication state handling in cookies", "Detailed charts drawing using canvas/SVG libraries"]
      },
      {
        level: 11,
        title: "Real-Time Chat Frontend",
        description: "Real-time communication app client with WebSocket integration, chat history display, and active online users list.",
        challenges: ["Message notifications sound triggers", "Unread counts bubble indicators on side profile cards"]
      }
    ],
    "React": [
      {
        level: 1,
        title: "Profile Card App",
        description: "Reusable Profile Card component containing Name, Photo, Role, Skills list, and Social links. Reuse it across a grid.",
        challenges: ["Define structured props validation types", "Toggle custom detail expansion states on click"]
      },
      {
        level: 2,
        title: "Counter & Score Tracker",
        description: "Multiple counters managing dashboard with increment, decrement, reset. Counters must operate independently.",
        challenges: ["State lifting to compute global score sum", "Add threshold limit configurations per counter"]
      },
      {
        level: 3,
        title: "Student Management App",
        description: "Add, delete, list, and search students in list state, updating components automatically.",
        challenges: ["Sort list elements alphabetically", "Highlight top scoring students dynamically"]
      },
      {
        level: 4,
        title: "Expense Tracker",
        description: "React finance app with transaction forms, categories selection, spending summary list, and real-time total updates.",
        challenges: ["Filter transactions by selected month", "Category breakdown charts using canvas/SVG wrappers"]
      },
      {
        level: 5,
        title: "Notes Manager",
        description: "Personal note-taking portal splitting UI into notes editor, lists grid, and searching options. Component-driven design.",
        challenges: ["Autosave modifications draft status using hooks", "Pin notes to top category listing"]
      },
      {
        level: 6,
        title: "Quiz Platform",
        description: "Interactive questionnaire stepping quiz application containing timer updates, choices evaluation, and final scores summary page.",
        challenges: ["Include explanation descriptions on wrong responses", "Add review question checkpoints flow"]
      },
      {
        level: 7,
        title: "Multi-Page College Portal",
        description: "Single Page Application using React Router. Pages: Home, Courses, Faculty, Events, and Contact.",
        challenges: ["Nested route layouts setup", "Active navigation tab styling indicators"]
      },
      {
        level: 8,
        title: "Movie Explorer",
        description: "Consume media REST APIs using useEffect and display paginated movie list, search queries, ratings, and info cards.",
        challenges: ["Implement infinite scroll scrolling logic", "Add favorite bookmarks list state"]
      },
      {
        level: 9,
        title: "Authentication Dashboard",
        description: "Secure login flow in React, tracking context state for user, role parameters, protected route redirects, and configurations page.",
        challenges: ["Session auto timeout alert handlers", "Dynamic theme provider setup (Dark/Light React context)"]
      },
      {
        level: 10,
        title: "Project Management System",
        description: "SaaS layout dashboard: Projects grid, task status columns (Pending, In Progress, Completed), project members selection, and comment logs.",
        challenges: ["Global reducer state management (useReducer)", "Optimistic UI updates on task moves"]
      },
      {
        level: 11,
        title: "Team Collaboration Platform",
        description: "Complete full-scale SaaS dashboard consuming backend APIs, sharing global user configurations, and displaying real-time metrics feeds.",
        challenges: ["WebSocket listener hooks connection", "Custom skeleton layouts loader indicators"]
      }
    ],
    "TypeScript": [
      {
        level: 1,
        title: "Student Record Manager",
        description: "Create student record CRUD script. Strongly type student objects: id, name, age, course. Ensure static validation.",
        challenges: ["Add Union type checks for courses selection", "Interface generics definitions for records search helper"]
      },
      {
        level: 2,
        title: "Product Inventory System",
        description: "Inventory manager. Predefine categorisation parameters as typescript Enums (e.g. Electronics, Books, Clothing) and model product attributes.",
        challenges: ["Type check minimum stock limit validation parameters", "Generate read-only product catalog structures"]
      },
      {
        level: 3,
        title: "Library Management System",
        description: "Strictly define object models for Books, Members, and Loans. Enforce compiler checks for book availability status checks.",
        challenges: ["Define intersection types for MemberWithOverdueLoans", "Type safe loan return event handlers"]
      },
      {
        level: 4,
        title: "Employee Management System",
        description: "Strongly typed departments management. Ensure salary fields and departments maps restrict mismatch errors during compiler checks.",
        challenges: ["Implement abstract class base for Employee roles", "Define utility types: Pick / Omit for profile updates"]
      },
      {
        level: 5,
        title: "Expense Tracker",
        description: "Rewrite Expense tracker system into strictly typed TypeScript code. Enforce interfaces for transactions, reports, and categories mapping.",
        challenges: ["Declare type safe lookup maps for category colors", "Tuple type annotations for coordinate metrics charts"]
      },
      {
        level: 6,
        title: "Quiz Platform",
        description: "Ensure quiz options, user answers, validations, scoring metrics, and quiz assets adhere to strict interfaces.",
        challenges: ["Implement Generics in Quiz fetch service", "Validate composite JSON schemas from API inputs"]
      },
      {
        level: 7,
        title: "E-Commerce Product Catalog",
        description: "Develop e-commerce product catalog supporting varying types of items (eg physical book vs digital download) using discriminated union types.",
        challenges: ["Enforce strict null checks on shipping address maps", "Type guard functions for downloadable assets validation"]
      },
      {
        level: 8,
        title: "API Client Dashboard",
        description: "Strongly type external API responses and query parameters. Design dashboards utilizing these custom data schemas safely.",
        challenges: ["Write mock mock-response interceptors matching schemas", "Map partial updates schemas dynamically using Partial utility"]
      },
      {
        level: 9,
        title: "Task Management System",
        description: "Complex linked task management system modeling Projects, Tasks, Users, and comments. Type states strictly (Pending, Active, Closed).",
        challenges: ["Define complex dictionary structures for user permissions", "Type check event emitters listeners structures"]
      },
      {
        level: 10,
        title: "Full SaaS Frontend Architecture",
        description: "Establish shared models types folder structure, schemas, type utilities, and global state layouts matching real enterprise apps.",
        challenges: ["Construct generic API response envelope wrapper types", "Dynamic schema validators configuration (e.g. zod/ts integration)"]
      },
      {
        level: 11,
        title: "React + TypeScript Project Management App",
        description: "Migrate Level 10 React Projects panel to fully type-safe React TSX files, defining all props, handlers, state models, and refs.",
        challenges: ["Type definitions for drag and drop mouse events", "Write type guards for custom error responses from Axios/Fetch"]
      }
    ]
  }
};
