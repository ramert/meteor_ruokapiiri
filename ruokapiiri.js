Producers = new Meteor.Collection("Producers");
Categories = new Meteor.Collection("Categories");
Products = new Meteor.Collection("Products");
Orders = new Meteor.Collection("Orders");
OrderRounds = new Meteor.Collection("OrderRounds");

if (Meteor.isClient) {
  Session.setDefault('current_producer', null);
  Session.setDefault('current_product', null);
  Session.setDefault('rounds_products_for_orderer', null);
  Session.setDefault('admin_selected_order_round', null);
  Session.setDefault('user_selected_order_round', null);
  Session.setDefault('isAdmin', false);
  Session.setDefault('current_producer_for_round', null);
  Session.setDefault('current_category_for_round', null);
  Session.setDefault('allowAccountCreation', true);

  Meteor.subscribe("users");
  Meteor.subscribe("producers");
  Meteor.subscribe("categories");
  Meteor.subscribe("products");
  Meteor.subscribe("orders");
  Meteor.subscribe("orderRounds", function() {
    var openRound = OrderRounds.findOne({Open: true}, {sort: {Name: 1}});
    //console.log(openRound);
    if (openRound != null)
    {
      Session.set('user_selected_order_round', openRound._id);
    }
  });


//Initialize jquery ui date picker and time picker

  Template.orders.rendered = function() {
    //console.log("Datepicker initialized!");
   $('#datepicker').datepicker( { autoclose: true,weekStart: 1 }).on('changeDate', function(event) {
    //TODO: bug, when clicking outside calendar the date is shown in wrong format
      var selectedRoundId = Session.get('admin_selected_order_round');
      var endDate = new Date(event.date);
      if (endDate != null) {
        var newName = "Tilaus "+formatDate(endDate);
        //console.log("Setting value for: "+selectedRoundId+" to: "+endDate);
        OrderRounds.update({_id: selectedRoundId}, {$set: { Name: newName, RoundDeadline: endDate}});
        //console.log(OrderRounds.find({}));
      }
   });
   /*$('#timepicker').timepicker({
    //TODO: selection does not work...
      //minuteStep: 30,
      //template: 'modal',
      //appendWidgetTo: '#timepicker',
      //showSeconds: true,
      showMeridian: false,
      defaultTime: false,
      //minuteStep: 15
      showInputs: true
      //disableFocus: false
   }).on('changeTime', function(event) {
      var selectedRoundId = Session.get('admin_selected_order_round');
      var endTime = event.date;
      if (endDate != null) {
        var newName = "Tilaus "+formatDate(endDate);
        //console.log("Setting value for: "+selectedRoundId+" to: "+endDate);
        OrderRounds.update({_id: selectedRoundId}, {$set: { Name: newName, RoundDeadline: endDate}});


   });*/
  };

  Handlebars.registerHelper("isAdmin", function() {
   var user = Meteor.users.findOne({_id: Meteor.userId()});
   if (user.role == 'admin')
   {
    return true;
   }
   return false;
  });

  function roundToOneDecimal(number) {
    //console.log(number+" after rounding: "+Math.round(number*10)/10:
    return Math.round(number*10)/10;

  }

  function getShoppingCartsTotal(userId, selectedRound) {
    var currentUser = userId;
    var currentRoundId = selectedRound;
    var shoppingCart = Orders.findOne({
      UserId: currentUser,
      OrderRoundId :currentRoundId
    });

    var totalPrice = 0;

    if (shoppingCart != null) {
      var actualProducts = shoppingCart.Products;
      for (i in actualProducts) 
      {
        //console.log(actualProducts[i].ProductAmount);
        totalPrice += (actualProducts[i].ProductAmount*actualProducts[i].ProductPrice);
      }
      roundedNumber = roundToOneDecimal(totalPrice);

      return roundedNumber+' €';
    }
    else {
      return '';
    }
  }

  function formatDate (formattedDate) {
      var date = formattedDate.getDate();
      var month = formattedDate.getMonth() + 1; //Months are zero based
      var year = formattedDate.getFullYear();
      return date+"."+month+"."+year; 

  }

  /*function getOpenOrderRound()
  {
    var openRound = OrderRounds.findOne({Open: true});
    if (openRound != null)
    {
      return openRound._id;
    }
  }*/

  function updateCartForCurrentRound(addedProductId, addedProductName, addedProductPrice, addedProductAmount, increment)
  {
    var currentRoundId = Session.get('user_selected_order_round');
    var currentUser = Meteor.userId();
    console.log(currentRoundId+" and: "+currentUser);
    Meteor.call('updateCart', currentRoundId, currentUser, addedProductId, addedProductName, addedProductPrice, addedProductAmount, increment);
  }


  Template.producers.producers = function() {
    return Producers.find({}, {sort: {Name: 1}});
  }

  Template.producers.selected = function() {
    return Session.equals('current_producer', this._id) ? 'selected' : '';
  }

  Template.producer.producer = function() {
    return Producers.findOne({_id: Session.get('current_producer')}, {});
  }

  Template.categories.categories = function() {
    return Categories.find({}, {sort: {Name: 1}});
  }

  Template.producer.products = function() {
    return Products.find({Producer_id: Session.get('current_producer')},{sort: {Name: 1}});
  }

  Template.producer.selected = function() {
    return Session.equals('current_product', this._id) ? 'selected' : '';
  }

  Template.open_rounds.selected = function() {
    return Session.equals('user_selected_order_round', this._id) ? 'selected' : '';
  }

  Template.product.product = function() {
    return Products.findOne({_id: Session.get('current_product')}, {});
  }

  Template.product.categories = function() {
    return Categories.find({}, {sort: {Name: 1}});
  }
  Template.product.selectedCategory = function() {
    var selected_product = Products.findOne({_id: Session.get('current_product')}, {});

    return selected_product.category_id == this._id ? "selected" : "";
  }
  Template.product.units = function() {
    return [{Name: 'kpl'}, {Name:'kg'}, {Name: 'pussi'}, {Name: 'pullo'}, {Name: 'purkki'}, {Name: 'paketti'}];
  }

  Template.product.selectedUnit = function() {
    var selected_product = Products.findOne({_id: Session.get('current_product')}, {});
    //console.log(selected_product.Unit+", this in context: "+this.Name);

    return selected_product.Unit == this.Name ? "selected" : "";
  }

  Template.product.prices = function() {
    return [{Name: 'Tarkka'}];
    //TODO: add support for inaccurate product price [{Name: 'Tarkka'}, {Name:'Ei tarkka'}];
  }
  Template.product_list.categories = function() { 
    return Categories.find({}, {sort: {Name: 1} , reactive: false});
  }

  Template.product_list.products = function(current_category_id) {
    //TODO: make this for the order round!
    //var select_round = Session.get('user_selected_order_round');
    //var products_for_this_category = OrderRounds.find({_id: select_round, "Products.CategoryId": current_category_id}, {"Products.$": 1});
    //Products.find()
    console.log(OrderRounds.find({parent: Session.get('user_selected_order_round'), CategoryId: current_category_id}));

    return OrderRounds.find({parent: Session.get('user_selected_order_round'), CategoryId: current_category_id});
    //return Products.find({category_id: current_category_id}, {sort: {Name: 1}, reactive: false});
  }

  Template.product_list.hasProducts = function(current_category_id) {
    //var products_for_this_category = Products.find({category_id: current_category_id}, {});
    var select_round = Session.get('user_selected_order_round');
    var products_for_this_category = OrderRounds.find({parent: select_round, CategoryId: current_category_id}, {reactive: false});

    return products_for_this_category.count() > 0;
  }

  Template.product_row.product = function(product_id){
    //console.log(product_id+ " result: "+Products.findOne( {_id: product_id}));
    return Products.findOne( {_id: product_id});
  }

  Template.users.users = function() {
    return Meteor.users.find({}, {sort: {Name: 1}});
  }

  Template.shopping_cart.cart = function() {

    var select_round = Session.get('user_selected_order_round');

    if (select_round != null) {
      var myCart = Orders.find({
        UserId: Meteor.userId(),
        OrderRoundId : select_round
      });
      return  myCart;
    }
  }

  Template.shopping_cart_rows.count = function() {
    var total = roundToOneDecimal(this.ProductPrice*this.ProductAmount);

    return total;
  }

  Template.user_products.round_selected = function() {
    //console.log(Session.get('user_selected_order_round'));
    return Session.get('user_selected_order_round') != null;
  }

  Template.user_products.round_is_open = function() {
    var selectedRoundId = Session.get('user_selected_order_round');
    if (selectedRoundId != null)
    {
        var orderRound = OrderRounds.findOne({_id: selectedRoundId});
        if (orderRound != null) {
          return orderRound.Open;
        }

    }
    else {
      return false;
    }
  }

  Template.user_products.deadline = function() {
    var selectedRoundId = Session.get('user_selected_order_round');
    if (selectedRoundId != null)
    {
        var orderRound = OrderRounds.findOne({_id: selectedRoundId});
        var deadline = orderRound.RoundDeadline;
        if (deadline != null) {
          //TODO make time work
          var time = '18:00'
          return "Tilauskierros sulkeutuu "+formatDate(deadline)+ " Kello: "+ time;
        }
        else {
          return "Tilauskierroksella ei ole määräaikaa"; 
        }
    }
  }

  Template.user_shopping_cart.product_count = function() {
    var currentUser = Meteor.userId();
    //TODO: bear in mind that there might be no open round
    var currentRoundId = Session.get('user_selected_order_round');
    var shoppingCart = Orders.findOne({
      UserId: currentUser,
      OrderRoundId :currentRoundId
    });

    var amountOfItems = 0;
    var amountText = ' tuotetta';

    //console.log(shoppingCart);
    if (shoppingCart != null) {
      var actualProducts = shoppingCart.Products;

      for (i in actualProducts) {
        amountOfItems += actualProducts[i].ProductAmount;
      }
      if (amountOfItems == 1)
      {
       amountText = ' tuote';
     }
      return amountOfItems +amountText;
    }
    else {
      return 'Tyhjä';
    }
  }

  Template.user_shopping_cart.products_price = function() {
    //TODO: bear in mind that there might be no open round
    return getShoppingCartsTotal(Meteor.userId(), Session.get('user_selected_order_round'));
  }

  Template.shopping_cart.products_price = function() {
    return getShoppingCartsTotal(Meteor.userId(), Session.get('user_selected_order_round'));
  }

  Template.orders_by_orderer.shopping_carts = function() {
    //TODO: change to handle multiple rounds...
    var currentRound = Session.get('admin_selected_order_round');
    //console.log("Selected round:" +currentRound);
    if (currentRound != null) {
      var orders = Orders.find({ OrderRoundId: currentRound});
      //console.log(orders);
      return orders;
    }
  } 

  Template.orders_by_orderer.user_name = function(userId)
  {
    var theUser = Meteor.users.findOne({_id: userId});
    //console.log(theUser);
    //TODO: now only returns email, should return name if set
    if (theUser != null) {
      if (theUser.emails != null)
        return theUser.emails[0].address;
    }

    return userId;
  }

  Template.orders_by_orderer.selected = function() {
    return Session.equals('rounds_products_for_orderer', this.UserId) ? 'selected' : '';
  }

  Template.users_shopping_cart.cart = function() {
    var user_id = Session.get('rounds_products_for_orderer');
    if (user_id != null) { 
      var myOrders = Orders.find( {
        OrderRoundId: Session.get('admin_selected_order_round'),
        UserId: user_id
      });
      return myOrders;
    }
  }

  Template.users_shopping_cart.products_price = function() {
    return getShoppingCartsTotal(this.UserId, Session.get('admin_selected_order_round'));
  }
 
  Template.users_shopping_cart_rows.count = function() {
    //console.log(this);
    var total = this.ProductPrice*this.ProductAmount;

    return total;
  }

  Template.order_rounds.order_rounds = function() {
    //console.log(OrderRounds.find({}, {sort: {Name: 1}}));
    return OrderRounds.find({parent: null}, {sort: {Name: 1}});
  }

  Template.open_rounds.all_open_rounds = function() {
    return OrderRounds.find({parent: null, Open: true});
  }

  Template.products_for_round.producers = function() {
    return Producers.find({}, {sort: {Name: 1}});
  }

  Template.products_for_round.categories = function() {
    return Categories.find({}, {sort: {Name: 1}});
  }
  Template.products_for_round.selectedProduct = function() {
    return Session.equals('current_producer_for_round', this._id) ? 'selected' : '';
  }
  Template.products_for_round.selectedCategory = function() {
    return Session.equals('current_category_for_round', this._id) ? 'selected' : '';
  }

  Template.products_for_round.productSelected = function() {
    return !Session.equals('current_producer_for_round', null);
  }

  Template.products_for_round.productChildrenSelected = function() {
    var roundProductsForProducer = OrderRounds.find({parent: Session.get('admin_selected_order_round'), ProducerId: this._id });
    //console.log(roundProductsForProducer);
    if (roundProductsForProducer != null) {
      var amountInRound = roundProductsForProducer.count();
      return amountInRound == 0 ? '':'someProducts';
    }      
  }

  Template.products_for_round.categoryChildrenSelected = function() {
    var roundProductsForCategory= OrderRounds.find({parent: Session.get('admin_selected_order_round'), CategoryId: this._id });
    //console.log(roundProductsForProducer);
    if (roundProductsForCategory != null) {
      var amountInRound = roundProductsForCategory.count();
      console.log("Count: "+amountInRound);
      return amountInRound == 0 ? '':'someProducts';
    }  
  }

    Template.products_for_round.categorySelected = function() {
    return !Session.equals('current_category_for_round', null);
  }

  Template.products_for_round.products_for_producer = function() {
    return Products.find({Producer_id: Session.get('current_producer_for_round')},{sort: {Name: 1}});
  }

  Template.products_for_round.products_for_category = function() {
    //console.log(Products.find({category_id: Session.get('current_category_for_round')}, {sort: {Name: 1}}))
    return Products.find({category_id: Session.get('current_category_for_round')}, {sort: {Name: 1}});
  }

  Template.products_for_round.all_products_selected = function() {
    var products;
    var currentProducer = Session.get('current_producer_for_round');
    var currentCategory = Session.get('current_category_for_round');

    if (currentProducer != null){
      products = Products.find({Producer_id: currentProducer},{sort: {Name: 1}});
    }
    else {
      products = Products.find({category_id: currentCategory},{sort: {Name: 1}});
    }

    if (products != null) {
      var amountOfProducts = 0;
      var orderRound = Session.get('admin_selected_order_round')
      products.forEach(function(product) {
        var productInRound = OrderRounds.findOne({parent: orderRound, ProductId: product._id});
        if (productInRound != null) {
          amountOfProducts++;
        }
      });
     return products.count() == amountOfProducts ? 'checked': '';
    }
    else {
     return '';
    }
  }

  Template.order_round_product_row.product_selected_for_round = function() {
    var productInRound = OrderRounds.findOne({parent: Session.get('admin_selected_order_round'), ProductId: this._id });
    //console.log(Session.get('admin_selected_order_round')+" and query: "+productInRound);
    //console.log("Product: "+this._id+", Query: "+productInRound);

    return productInRound == undefined ? '':'checked';
  }

  Template.order_rounds.roundSelected = function() 
  {
      //console.log("Is round selected: "+this._id);
      return Session.get('admin_selected_order_round') == this._id ? 'selected' : '';
  }

  Template.orders.endDate = function() {
    var selectedRoundId = Session.get('admin_selected_order_round');
    if (selectedRoundId != null) {
      var orderRound = OrderRounds.findOne({_id: selectedRoundId});
      if (orderRound != null) {
        var deadline = orderRound.RoundDeadline;
       if (deadline != null) {
         return formatDate(deadline);
       }   
      }
    }
  }

  Template.orders.endTime = function() {
    return "18:00";
  }

  Template.orders.roundSelected = function() {
    return Session.get('admin_selected_order_round') != null;
  }

  Template.orders.roundIsOpen = function() {
    var selectedRoundId = Session.get('admin_selected_order_round');
    if (selectedRoundId != null) {
      var orderRound = OrderRounds.findOne({_id: selectedRoundId});
      if (orderRound != null) {
        return orderRound.Open;
      }
    }
  }

  Template.logInScreen.allowAccountCreation = function() {
    return Session.get('allowAccountCreation');
  }

  Template.product.wholePrice = function() {
    //TODO: make it work
    return this.Price;
  }

  Template.producers.events({
    'click .add_producer' : function () {
      //TODO: Fix hack solution with .toString. What is the object id with attribute?
      Producers.insert({Name : "Uusi tuottaja"}, function(err, newItem) {Session.set('current_producer', newItem.toString());});
    },
    'click .remove_producer' : function() {
      Producers.remove(this._id);
    },
    'click .producer_list_element' : function() {
      //TODO: This is triggered with delete. WHY?!?
      Session.set('current_producer', this._id);
      var firstProduct = Products.findOne({Producer_id: Session.get('current_producer')});
      firstProduct != null ? Session.set('current_product', firstProduct._id): Session.set('current_product', null)
    }
  });

  Template.producer.events( {
    'blur input':function(event,context) {
        Producers.update(this._id, {$set:{Name : event.target.value}});
    },
    'click .add_product': function() {
      //TODO: Fix hack solution with .toString. What is the object id with attribute?
        Products.insert({Name : "Uusi tuote", Producer_id: Session.get('current_producer'), ProductPriceType: 'Tarkka', ProductPackages: [ '1' ]}, 
          function(err, newItem) {Session.set('current_product', newItem.toString());}
        );
    },
    'click .remove_product' : function() {
      Products.remove(this._id);
    },
    'click .product_list_element' : function() {
      Session.set('current_product', this._id);
    }
  });

  Template.categories.events({
    'click .remove_category' : function() {
      Categories.remove(this._id);
    }
  });

  Template.product.events({
    'blur .product_name':function(event,context) {
        Products.update(this._id, {$set:{Name : event.target.value}});
    },
    'blur .product_price':function(event, context) {
        Products.update(this._id, {$set: {Price: event.target.value}});
        //TODO: almost duplicate, make generic with html id / type / value type / smthg
    },
    'change .category-form-control' : function(event, context) {
      var current_product_id = Session.get('current_product');
      var category_name = event.target.value;
      var category = Categories.findOne({Name: category_name},{});
      Products.update(current_product_id, {$set: {category_id: category._id}});
    },
    'change .unit-form-control': function(event, context) {
      var current_product_id = Session.get('current_product');
      var unit = event.target.value;
      Products.update(current_product_id, {$set: {Unit: unit}});
    },
    'click .add_size_unit' : function(event, contect) {
      //var packages = this.ProductPackages;

      Products.update(this._id, {$push: {ProductPackages: 1}});
      console.log("Adding size unit:"+this._id);
    },
    'click .remove_package' : function(event, context) {
      console.log("Removing size unit: "+context.data._id+" , "+this[0]);
      Products.update(context.data._id, {$pull: {ProductPackages: this[0]}});
    }

  });

  Template.new_category.events({
    'click .category' : function (event, context) {
      //TODO: make context right, so that no need for this...
      Categories.insert({Name : context.find(".new_category_name").value});
    },
  });

  Template.users.events({
    'click .allow_order' : function() {
      Meteor.users.update({_id: this._id}, {$set: {role: 'normal'}});
      //console.log(Meteor.users.findOne({_id: this._id}));
    },
    'click .allow_admin' : function() {
      Meteor.users.update({_id: this._id}, {$set: {role: 'admin'}});
      //console.log(Meteor.users.findOne({_id: this._id}));
    }
  });

  Template.product_row.events({
    'click .add_basket' : function(event, context) {
        var addedProductId = this._id;
        var addedProductName = this.Name;
        var addedProductPrice = this.Price;
        var addedProductAmount = 1;
        //console.log(addedProductId+", "+addedProductName+", "+addedProductPrice+", "+addedProductAmount, true)
        //Meteor.call('updateCart', currentRoundId, currentUser, addedProductId, addedProductName, addedProductPrice, amount, true);

        updateCartForCurrentRound(addedProductId, addedProductName, addedProductPrice, addedProductAmount, true);
    }
  });

  Template.shopping_cart_rows.events({
    'blur .amount' : function(event, context) {
      var addedProductAmount = parseInt(context.find('input').value);
      if (addedProductAmount > 0) {
          var addedProductId = this.ProductId;
          var addedProductName = this.ProductName;
          var addedProductPrice = this.ProductPrice;
          updateCartForCurrentRound(addedProductId, addedProductName, addedProductPrice, addedProductAmount, false);
      }
      //If set to zero or negative, should remove
      else {
        Meteor.call('removeFromCart', Session.get('user_selected_order_round'), Meteor.userId(), this.ProductId);
      }
    },
    'click .remove_product' : function(event, context) {
      Meteor.call('removeFromCart', Session.get('user_selected_order_round'), Meteor.userId(), this.ProductId);
    }

  }); 

  Template.orders_by_orderer.events({
      'click .orderer-list-element' : function() {
      //TODO: This is triggered with delete. WHY?!?
      Session.set('rounds_products_for_orderer', this.UserId);
    }
  })

  Template.users_shopping_cart_rows.events({
    'click .remove-product' : function(event, context) {
      Meteor.call('removeFromCart', Session.get('admin_selected_order_round'), Session.get('rounds_products_for_orderer'), this.ProductId);
    }
  })

  Template.order_rounds.events({
    'click .add_round' : function() {
      OrderRounds.insert({Name: 'Uusi kierros', Open: false});
    },
    'click .order_list_element' : function() {
      Session.set('admin_selected_order_round', this._id);
    }
  })

  Template.products_for_round.events({
    'click .producer_list_element' : function() {
      Session.set('current_category_for_round', null);
      Session.set('current_producer_for_round', this._id);
    },
    'click .category_list_element' : function() {
      Session.set('current_producer_for_round', null);
      Session.set('current_category_for_round', this._id);
    },
    'change .selectAll' : function(event) {
      //console.log(event.target.checked);
      //Set all producers products
      var producerId = Session.get('current_producer_for_round');
      productForProducer = Products.find({Producer_id: producerId},{sort: {Name: 1}});
      productForProducer.forEach(function(product) {
        if (event.target.checked) {
         OrderRounds.insert(
         {
            parent: Session.get('admin_selected_order_round'),
            ProductId: product._id, 
            CategoryId: product.category_id,
            ProducerId: product.Producer_id
         });
        }
        else {
          Meteor.call('removeProductFromRound',Session.get('admin_selected_order_round'),product._id);
        } 
      })
      //console.log(OrderRounds.find({_id: Session.get('admin_selected_order_round')}));
    }
  })

  Template.order_round_product_row.events({
    'change input' : function(event) {
      //console.log(OrderRounds.find({_id: Session.get('admin_selected_order_round')}));

      //var productInRound = OrderRounds.findOne({_id: Session.get('admin_selected_order_round'), "Products.ProductId": this._id }, {"Products.$": 1})
      //If checkbox for product select, add to the current order round
      //console.log("Value now: "+event.target.value);

      if (event.target.checked) {
        //console.log("Adding: product id: "+this._id);
        //console.log("Adding: "+this._id + " with "+this.category_id);
        OrderRounds.insert(
          {
            parent: Session.get('admin_selected_order_round'),
            ProductId: this._id, 
            CategoryId: this.category_id,
            ProducerId: this.Producer_id
          }
          );
        //console.log(OrderRounds.find({}));
      }
      //If unselected should be in the curent round, so remove
      else {
        //console.log("Removing product id: "+this._id);
        Meteor.call('removeProductFromRound', Session.get('admin_selected_order_round'), this._id);
        //OrderRounds.remove({_id: , });
      }
    }
  })

  Template.open_rounds.events( {
    'click .order_list_element' : function() {
      //console.log("Setting user selected round: "+this._id);
      Session.set('user_selected_order_round', this._id);
    }
  });

  Template.orders.events({
    'click .open_round': function() {
        var selectedRoundId = Session.get('admin_selected_order_round');
        OrderRounds.update({_id: selectedRoundId}, {$set: { Open: true}});
      },
      'click .close_round': function() {
        var selectedRoundId = Session.get('admin_selected_order_round');
        OrderRounds.update({_id: selectedRoundId}, {$set: { Open: false}});
      }
  });

  Template.logInScreen.events ({
    'click .login' : function(event, context) {
      var emailAddress = context.find('input.userName').value;
      var password = context.find('input.password').value;
      var logIn = Session.get('allowAccountCreation');
      if (!logIn) {
        console.log("Creating new user");
        if (emailAddress != null) {
        Meteor.call('createAccount', emailAddress, password, function(error, data) {
          if (!error) {
            console.log("New user created");
            Meteor.loginWithPassword(emailAddress, password, function(err){
            if (err) {
              console.log(err);
            };
            Session.set('allowAccountCreation', true);
            });
          }
        });
        }
      }
      else {
        if (emailAddress != null)
         //console.log(emailAddress+", "+password);
           Meteor.loginWithPassword(emailAddress, password, function(err){
         if (err) {
          console.log(err);
        };
       });
      }
    },
    'click .createAccount' : function() {
      Session.set('allowAccountCreation', false);
    }

  });
}
if (Meteor.isServer) {
  Meteor.startup(function () {
    //If no users defined, create admin
    if (Meteor.users.find({}).count() == 0)
    {
        var options = {email: 'rami.ertimo@gmail.com', password: 'admin'};
        Accounts.createUser(options);
    }
    //TODO: remove, if need to clean Order rounds...
    //OrderRounds.remove({});
    //OrderRounds.insert({Name : "testRound 1", Open: true, Products: []});
    //Products.remove({});
    //Orders.remove({});
    //Meteor.users.remove({});

    Meteor.publish("producers", function() {
      //TODO check for admin role.
      return Producers.find({});
    });

    Meteor.publish("categories", function() {
      return Categories.find({});
    });

    Meteor.publish("products", function(){
        return Products.find({})
    });

    Meteor.publish("orders", function() {
      var user = Meteor.users.findOne(this.userId);

      if (user) {
        return Orders.find({UserId: this.userId})
        if (user.role === 'admin') {
          return Orders.find({});
        }
      }
    });

    Meteor.publish("orderRounds", function() {
      return OrderRounds.find({});
    });

    Meteor.methods({
    /*isAdmin: function()
    {
      var user = Meteor.users.findOne({_id: this.userId});
      console.log('Users role is:'+user.role);
      if (user.role == 'admin') {
        console.log("Setting user to admin!");
        return true;
      }
    },*/
    updateCart: function(currentRoundId, currentUser, addedProductId, addedProductName, addedProductPrice, amount, increment) {
      //console.log("user:  "+currentUser+ ", round: "+currentRoundId);
      var shoppingCart = Orders.findOne({
        UserId: currentUser,
        OrderRoundId :currentRoundId
      });

      //User has not made any orders - initialize the order and add the first product
      if (shoppingCart == null) {
        Orders.insert( 
        {
          UserId: currentUser,
          OrderRoundId :currentRoundId,
          Products: [{
            ProductId: addedProductId,
            ProductName: addedProductName,
            ProductAmount: amount,
            ProductPrice: addedProductPrice
          }]
        }
        );
      }
      //User has made at least one order, update shopping cart
      else {
        var product = Orders.findOne({_id: shoppingCart._id, "Products.ProductId": addedProductId}, {"Products.$": 1});
        //If this product has been already added to cart
        if (product != null) 
        {
          //If amount set manually in Shopping cart
          if (!increment) 
          {
            Orders.update(
            {
              _id: shoppingCart._id,
              "Products.ProductId": addedProductId
            },
            {$set: { "Products.$.ProductAmount" : amount }}
            );
          }
          //If amount added by one in Products
          else {
            Orders.update(
            {
              _id: shoppingCart._id,
              "Products.ProductId": addedProductId
            },
            {$inc: { "Products.$.ProductAmount" : 1 }}
            );
          }
        }
        //If this product has not yet bee added, push new embedded doc to array
        else {
          Orders.update(
          {
            _id: shoppingCart._id,
          },
          {$push: { Products: {
            ProductId: addedProductId,
            ProductName: addedProductName,
            ProductAmount: amount,
            ProductPrice: addedProductPrice
          }}}
        );
      }
      }
    },
    removeFromCart: function(currentRoundId, currentUser, removedProductId) {
      var shoppingCart = Orders.findOne({
        UserId: currentUser,
        OrderRoundId :currentRoundId
      });
      if (shoppingCart != null){
        Orders.update(
        {
          _id: shoppingCart._id,
        },
        {$pull: { Products : {  ProductId: removedProductId }}}
        );
      }

    },
    removeProductFromRound: function(orderRoundId, productId) {
      OrderRounds.remove({parent: orderRoundId, ProductId: productId});
    },
    createAccount: function(emailAddress, newPassword) {
      var options = {email: emailAddress, password: newPassword};
      Accounts.createUser(options);
    }
    /*productInCart: function(currentRoundId, currentUser, addedProductId) {
      console.log("user:  "+currentUser+ ", round: "+currentRoundId);
      var shoppingCart = Orders.findOne({
        UserId: currentUser,
        OrderRoundId :currentRoundId
      });
      if (shoppingCart != null) {
        console.log(Orders.findOne({_id: shoppingCart._id, "Products.ProductId": addedProductId}, {"Products.$": 1}));
        return Orders.findOne({_id: shoppingCart._id, "Products.ProductId": addedProductId}, {"Products.$": 1});
      }
      else {
        console.log("shoppingCar is null - snif");
        return null;
      }
    }*/
  });    
});


  Meteor.publish("users", function () {
    var user= Meteor.users.findOne(this.userId);
    if (user && user.role == 'admin') {
        return Meteor.users.find({});
    }
    else {
      return Meteor.users.find({_id: this.UserId});
    }
  });

  //TODO: Example about role handling... 
  /*Meteor.publish("extraUserData", function () {
  var user = Meteor.users.findOne(this.userId);
  var fields;

  if (user && user.role === 'counselor')
    fields = {pricePerSession: 1};
  else if (user && user.role === 'student')
    fields = {counselor: 1, sessionsRemaining: 1};

  // even though we want one object, use `find` to return a *cursor*
  return Meteor.users.find({_id: this.userId}, {fields: fields});
});



*/

  Meteor.users.allow({
    update: function (userId, user) {     
     return true; 
    }
  });
}