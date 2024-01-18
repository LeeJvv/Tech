//Structure

class Category {
  constructor(categoryID, name) {
    this.categoryID = categoryID;
    this.name = name;
    this.items = [];
    this.subcategories = [];
  }
}

class Item {
  constructor(itemID, name, description, categoryID) {
    this.itemID = itemID;
    this.name = name;
    this.description = description;
    this.categoryID = categoryID;
  }
}

class Customer {
  constructor(customerID, name, email, password) {
    this.customerID = customerID;
    this.name = name;
    this.email = email;
    this.password = password;
  }
}

class Visibility {
  constructor(categoryID, customerID, visible) {
    this.categoryID = categoryID;
    this.customerID = customerID;
    this.visible = visible;
  }
}

class CategoryItemRelation {
  constructor(relationID, categoryID, itemID) {
    this.relationID = relationID;
    this.categoryID = categoryID;
    this.itemID = itemID;
  }
}

// Data creation
const electronicsCategory = new Category(1, 'Electronics');
electronicsCategory.items.push(new Item(101, 'Smartphone', 'iPhone', 1));
electronicsCategory.items.push(new Item(102, 'Laptop', 'iMac', 1));

const clothingCategory = new Category(2, 'Clothing');
clothingCategory.items.push(new Item(201, 'T-shirt', 'Comfortable cotton T-shirt', 2));
clothingCategory.items.push(new Item(202, 'Jeans', 'Classic denim jeans', 2));

const johnDoe = new Customer(1, 'John Doe', 'john@example.com', 'password123');
const visibilityElectronicsJohn = new Visibility(1, 1, true);
const visibilityClothingJohn = new Visibility(2, 1, false);

const categoryItemRelations = [
  new CategoryItemRelation(1, 1, 101),
  new CategoryItemRelation(2, 1, 102),
  new CategoryItemRelation(3, 2, 201),
  new CategoryItemRelation(4, 2, 202),
];

//Function for list of objects

function computeVisibleItemsForCustomers(rootCategory, visibilityData) {
  const visibleItemsByCustomer = {};

  function traverseCategory(category, parentVisibility = true) {
    const currentVisibility = parentVisibility && getVisibilityForCategory(category.categoryID);

    const visibleItems = category.items
      .filter(item => currentVisibility && currentVisibility[item.itemID])
      .map(({ itemID, name, description }) => ({ ItemID: itemID, Name: name, Description: description }));

    category.subcategories.forEach(subcategory => traverseCategory(subcategory, currentVisibility));

    if (visibleItems.length > 0) {
      const customerID = currentVisibility.customerID;
      visibleItemsByCustomer[customerID] = (visibleItemsByCustomer[customerID] || []).concat(visibleItems);
    }
  }

  function getVisibilityForCategory(categoryID) {
    return visibilityData.find(visibility => visibility.categoryID === categoryID) || { visible: false };
  }

  traverseCategory(rootCategory);
  return Object.entries(visibleItemsByCustomer).map(([customerID, items]) => ({ CustomerID: +customerID, VisibleItems: items }));
}

// Example usage:
const result = computeVisibleItemsForCustomers(electronicsCategory, [visibilityElectronicsJohn, visibilityClothingJohn]);

// Print the result to the console
console.log(result);
