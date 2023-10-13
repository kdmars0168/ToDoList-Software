// Import necessary modules
import express from "express";
import bodyParser from "body-parser";
import mongoose from "mongoose";
import _ from "lodash";

// Create an Express application
const app = express();

// Middleware to parse incoming request bodies
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

// Set the view engine to EJS
app.set("view engine", "ejs");

// Connect to MongoDB
mongoose.connect("mongodb+srv://admin-mohaimen:Test123@cluster0.wg3r3gg.mongodb.net/todolistDB", { useNewUrlParser: true, useUnifiedTopology: true });

// Define the schema for individual items
const itemSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true, // Ensure that a name is required
  },
});

// Create model for item schema. Model is used to interact with db
const Item = mongoose.model("Item", itemSchema);

// Create default items array
const item1 = new Item({
  name: "Welcome to your todolist!",
});
const item2 = new Item({
  name: "Hit the + button to add a new item.",
});
const item3 = new Item({
  name: "<-- Hit this to delete an item.",
});

// Create default items array
const defaultItems = [item1, item2, item3];

// Define a schema for lists, containing an array of items
const listSchema = new mongoose.Schema({
  name: String,
  items: [itemSchema],
});

// Create a model based on the list schema
const List = mongoose.model("List", listSchema);

// Using async/await for cleaner code
const startServer = async () => {
  try {
    await mongoose.connect("mongodb+srv://admin-mohaimen:Test123@cluster0.wg3r3gg.mongodb.net/todolistDB", { useNewUrlParser: true, useUnifiedTopology: true });
    console.log("Connected to MongoDB");

    // Insert default items to the database
    await Item.insertMany(defaultItems);

    // Start the server
    app.listen(3000, () => {
      console.log("Server started on port 3000");
    });
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
  }
};

// Call the function to start the server
startServer();

// Handle GET request for the root route
app.get("/", async (req, res) => {
  try {
    // Fetch items from the database
    const items = await Item.find({}).exec();

    // Check if there are no items in the database
    if (items.length === 0) {
      // If no items, insert default items into the database only if it's the first time
      const count = await Item.countDocuments();
      if (count === 0) {
        await Item.insertMany(defaultItems);
      }

      // Redirect to the root route to render the updated list
      res.redirect("/");
    } else {
      // If items are present, render the "list" view with the fetched items
      res.render("list", { listTitle: "Today", newListItems: items });
    }
  } catch (error) {
    // Handle any errors that occur during the database operation
    console.error(error);
  }
});

// Handle POST request for adding a new item
app.post("/", async (req, res) => {
  const itemName = req.body.newItem;
  const listName = req.body.list;

  if (!itemName.trim()) {
    return res.redirect(listName === "Today" ? "/" : `/${listName}`);
  }

  try {
    const newItem = new Item({ name: itemName });

    if (listName === "Today") {
      await newItem.save();
      console.log("Successfully added an item to the Today list");
      res.redirect("/");
    } else {
      const foundList = await List.findOne({ name: listName });

      if (!foundList) {
        // Handle the case where the list is not found
        return res.status(404).send("List not found");
      }

      foundList.items.push(newItem);
      await foundList.save();
      console.log(`Successfully added an item to the ${listName} list`);
      res.redirect("/" + listName);
    }
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});

// Handle POST request for item deletion
app.post("/delete", async (req, res) => {
  const checkedItemId = req.body.checkbox;
  const listName = req.body.listName; // Add this line to get the listName from the request body

  try {
    if (listName === "Today") {
      // Delete the item from the Item collection
      await Item.findByIdAndRemove(checkedItemId);
      res.redirect("/");
    } else {
      // Delete the item from the corresponding list in the List collection
      const updateResult = await List.findOneAndUpdate(
        { name: listName },
        { $pull: { items: { _id: checkedItemId } } }
      );

      if (updateResult) {
        res.redirect("/" + listName);
      } else {
        res.status(404).send("List not found");
      }
    }
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});

// Handle dynamic lists using route parameters
app.get("/:customListName", async (req, res) => {
  const customListName = _.capitalize(req.params.customListName);

  try {
    const foundList = await List.findOne({ name: customListName });

    if (!foundList) {
      // If the list doesn't exist, create it with default items
      const list = new List({
        name: customListName,
        items: defaultItems,
      });
      await list.save();
      res.redirect("/" + customListName);
    } else {
      // If the list exists, render it
      res.render("list", { listTitle: foundList.name, newListItems: foundList.items });
    }
  } catch (error) {
    console.error(error);
  }
});

// Handle GET request for the about route
app.get("/about", (req, res) => {
  res.render("about");
});
