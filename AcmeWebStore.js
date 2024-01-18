//Structure based on ERD design
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

class Visibility {
  constructor(categoryID, customerID, visible) {
    this.categoryID = categoryID;
    this.customerID = customerID;
    this.visible = visible;
  }
}

// Sample Data Creation
const electronicsCategory = new Category(1, 'Electronics');
electronicsCategory.items.push(new Item(101, 'Smartphone', 'iPhone', 1));
electronicsCategory.items.push(new Item(102, 'Laptop', 'iMac', 1));

const clothingCategory = new Category(2, 'Clothing');
clothingCategory.items.push(new Item(201, 'T-shirt', 'Comfortable cotton T-shirt', 2));
clothingCategory.items.push(new Item(202, 'Jeans', 'Classic denim jeans', 2));

const johnDoe = { customerID: 1, name: 'John Doe' };
const visibilityElectronicsJohn = new Visibility(1, johnDoe.customerID, true);
const visibilityClothingJohn = new Visibility(2, johnDoe.customerID, false);

const categoryItemRelations = [
  { relationID: 1, categoryID: 1, itemID: 101 },
  { relationID: 2, categoryID: 1, itemID: 102 },
  { relationID: 3, categoryID: 2, itemID: 201 },
  { relationID: 4, categoryID: 2, itemID: 202 },
];
//Function
function computeVisibleItemsForCustomers(rootCategory, visibilityData, categoryItemRelations) {
  const visibleItemsByCustomer = {};

  function traverseCategory(category, visibility) {
    const visibleItems = categoryItemRelations
      .filter(relation => relation.categoryID === category.categoryID)
      .map(relation => {
        const item = category.items.find(item => item.itemID === relation.itemID);
        return { ItemID: item.itemID, Name: item.name, Description: item.description };
      })
      .filter(item => visibility && visibility.visible);

    category.subcategories.forEach(subcategory => {
      const subVisibility = visibilityData.find(v => v.categoryID === subcategory.categoryID);
      traverseCategory(subcategory, subVisibility);
    });

    if (visibleItems.length > 0) {
      const customerID = visibility ? visibility.customerID : undefined;
      visibleItemsByCustomer[customerID] = (visibleItemsByCustomer[customerID] || []).concat(visibleItems);
    }
  }

  traverseCategory(rootCategory, visibilityData.find(v => v.categoryID === rootCategory.categoryID));
  return Object.entries(visibleItemsByCustomer).map(([customerID, items]) => ({ CustomerID: +customerID, VisibleItems: items }));
}

// Example usage:
const result = computeVisibleItemsForCustomers(electronicsCategory, [visibilityElectronicsJohn, visibilityClothingJohn], categoryItemRelations);

// Print the result to the console
console.log(result);
