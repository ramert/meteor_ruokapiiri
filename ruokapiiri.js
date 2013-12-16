Producers = new Meteor.Collection("Producers");
Categories = new Meteor.Collection("Categories");
Products = new Meteor.Collection("Products");
Orders = new Meteor.Collection("Orders");
OrderRounds = new Meteor.Collection("OrderRounds");

 var READY_FOR_DELIVERY = 3;
 var DELIVERY_COMPLETE = 6;
 var PAYMENT_COMPLETE = 9;

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

  var accuratePrice = 'Tarkka';
  var inaccuratePrice = 'Ei tarkka';


//Initialize jquery ui date picker and time picker. As separate with hack date setting, because no good enough date & time commponent found.

  Template.orders.rendered = function() {
   $('#datepicker').datepicker( { 
      autoclose: true,
      weekStart: 1 
    }).on('changeDate', function(event) {
      var endDate = new Date(event.date);
      if (endDate != null) {
        var time = $('#timepicker').val();
        console.log(time);
        if (time == null) {
          time = "20:00";
        }
        setDateAndTime(endDate, time);
      }
   });
   $('#timepicker').timepicker({
        showMeridian: false,
        template: false,
        showInputs: true,
        minuteStep: 30
      }).on('changeTime.timepicker', function(event) {
        var endDate = $('#datepicker').data('datepicker').date;
        if (endDate != null) {
          var time = event.time.value;
          if (time != null) {
            setDateAndTime(endDate, time);
          }
        }
    });
  };

  Handlebars.registerHelper("isAdmin", function() {
   var user = Meteor.users.findOne({_id: Meteor.userId()});
   if (user.role == 'admin')
   {
    return true;
   }
   return false;
  });

  Handlebars.registerHelper("usersShoppingCart", function() {
    var select_round = Session.get('user_selected_order_round');
    if (select_round != null) {
      var myCart = Orders.findOne({
        UserId: Meteor.userId(),
        OrderRoundId : select_round
      }, {sort: {"Products.ProductName": 1}});
      //console.log(myCart);
      return  myCart;
    }
  });

  Handlebars.registerHelper("countProductPrice", function(product) {
    var total = product.ProductPrice*product.ProductAmount*product.ProductPackageSize;

    return roundToOneDecimal(total);
  });

  Handlebars.registerHelper("shoppingCartTotal", function() {
    return getShoppingCartsTotal(Meteor.userId(), Session.get('user_selected_order_round'));
  });

  function setDateAndTime(date, time){
    var selectedRoundId = Session.get('admin_selected_order_round');
    var selectedRound = OrderRounds.findOne({_id: selectedRoundId});
    var hours = parseHours(time);
    var minutes = parseMinutes(time); 
    date.setHours(hours);
    date.setMinutes(minutes);
    //console.log("Setting value for: "+selectedRoundId+" to: "+endDate);
    var newName = "Tilaus "+formatDate(date);
    OrderRounds.update({_id: selectedRoundId}, {$set: { Name: newName, RoundDeadline: date}});
    var currentTime = new Date();
    if (date < currentTime) {
      OrderRounds.update({_id: selectedRoundId}, {$set: { Open: false, CanOpen: false}});
    }
    else {
      OrderRounds.update({_id: selectedRoundId}, {$set: { CanOpen: true}});
    }
    //console.log(OrderRounds.find({}));
  }

  function parseHours(time) {
    return time.slice(0,2);
  }

  function parseMinutes(time) {
    return time.slice(3,5);
  }

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
        totalPrice += (actualProducts[i].ProductAmount*actualProducts[i].ProductPrice*actualProducts[i].ProductPackageSize);
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
      if (date < 10) {
        date = '0'+date;
      }
      var month = formattedDate.getMonth() + 1; //Months are zero based
      if (month < 10 ) {
        month = '0'+month;
      }
      var year = formattedDate.getFullYear();
      return date+"."+month+"."+year; 
  }
  function formatTime(hours, minutes) {
    if (hours < 10) {
      hours = '0'+hours;
    }
    if (minutes < 10) {
      minutes = '0'+minutes;
    }
    return hours+":"+minutes;
  }

  /*function getOpenOrderRound()
  {
    var openRound = OrderRounds.findOne({Open: true});
    if (openRound != null)
    {
      return openRound._id;
    }
  }*/

  function updateCartForCurrentRound(addedProductId, addedProductName, addedProductPrice, addedProductPriceIsAccurate, addedPackageSize, addedProductUnit, addedProductAmount, increment)
  {
    var currentRoundId = Session.get('user_selected_order_round');
    var currentUser = Meteor.userId();
    //console.log(currentRoundId+" and: "+currentUser);
    Meteor.call('updateCart', currentRoundId, currentUser, addedProductId, addedProductName, addedProductPrice, addedProductPriceIsAccurate, addedPackageSize, addedProductUnit, addedProductAmount, increment);
  }

  function setCartStatus(cartId, setStatus) {
    var cart = Orders.findOne({_id: cartId});
    var status = cart.Status;
    //console.log("Status: "+status);
    if (status >= setStatus)
    {
      status = setStatus-1;
      Orders.update({_id: cartId}, {$set: {Status: status}});
    }
    else {
      //console.log("Setting status to: "+setStatus+ "for cart: "+cart);
      Orders.update({_id: cartId}, {$set: {Status: setStatus}});
    }
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

  Template.users_rounds.all_open_rounds = function() {
    return OrderRounds.find({parent: null, Open: true});
  }

  Template.users_rounds.selected = function() {
    return Session.equals('user_selected_order_round', this._id) ? 'selected' : '';
  }

  Template.users_rounds.past_order_round = function() {
    var ordersForUser = Orders.find({UserId: Meteor.userId()});
    var userRoundIds = [];
    ordersForUser.forEach(function(ordersForRound) {
      userRoundIds.push(ordersForRound.OrderRoundId);
    });
    return OrderRounds.find({parent: null, Open: false, _id: {$in: userRoundIds}}, {sort: {Name: -1}});
    
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

    return selected_product.Unit == this.Name ? "selected" : "";
  }

  Template.product.prices = function() {
    return [{Name: accuratePrice}, {Name: inaccuratePrice }];
  }

  Template.product.selectedPrice = function() {
    var selected_product = Products.findOne({_id: Session.get('current_product')}, {});
    var priceIsAccurate = selected_product.PriceIsAccurate;
    var priceTypeText;
    if (priceIsAccurate){
      priceTypeText = accuratePrice;
    }
    else {
      priceTypeText = inaccuratePrice;
    }
    var result = priceTypeText == this.Name? "selected" : "";
    console.log(this.Name+" is "+priceTypeText+ " = "+result);
    return priceTypeText == this.Name? "selected" : "";
  }


  Template.product_list.categories = function() { 
    return Categories.find({}, {sort: {Name: 1} , reactive: false});
  }

  Template.product_list.products = function(current_category_id) {
    return OrderRounds.find({parent: Session.get('user_selected_order_round'), CategoryId: current_category_id});
  }

  Template.product_list.hasProducts = function(current_category_id) {
    var select_round = Session.get('user_selected_order_round');
    var products_for_this_category = OrderRounds.find({parent: select_round, CategoryId: current_category_id}, {reactive: false});

    return products_for_this_category.count() > 0;
  }

  Template.product_row.product = function(product_id){
    return Products.findOne( {_id: product_id});
  }
  Template.product_row.multiplePackages = function()
  {
    var packages = this.ProductPackages;
    //console.log(packages);
    return packages.length > 1 ? '': 'disabled';
  }
  Template.product_row.isInaccurate = function() {
    return this.PriceIsAccurate ? '': '~';
  }

  /*Template.product_row.buttonText = function() {
    //console.log("User:"+Meteor.userId()+", Round: "+Session.get('user_selected_order_round')+", Product "+this._id);

    var product = Orders.findOne({UserId: Meteor.userId(), OrderRoundId: Session.get('user_selected_order_round'), "Products.ProductId": this._id});
    //console.log(product);
    if (product == null) {
       return "Lisää koriin";
    }
    else {
      return "Lisää vielä";
    }
  }*/

  /*Template.product_row.inCart = function() {
     var product = Orders.findOne({UserId: Meteor.userId(), OrderRoundId: Session.get('user_selected_order_round'), "Products.ProductId": this._id});
    
    if (product == null) {
      return 'btn-success';
    }
    else {
      return "btn-primary";
    }
  }*/

  Template.users.users = function() {
    return Meteor.users.find({}, {sort: {Name: 1}});
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
          var hours = deadline.getHours();
          var minutes = deadline.getMinutes();
          var deadlineTime = formatTime(hours, minutes);

          return "Kierros sulkeutuu "+formatDate(deadline)+ " Kello: "+ deadlineTime;
        }
        else {
          return "Kierroksella ei ole määräaikaa"; 
        }
    }
  }

  Template.user_shopping_cart.product_count = function() {
    var currentUser = Meteor.userId();
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

  Template.orders.canOpen = function() {
    var currentRoundId = Session.get('admin_selected_order_round');
    var round = OrderRounds.findOne({_id: currentRoundId});
    if (round != null) {
      var canOpen = round.CanOpen;
      //console.log(canOpen);
      return !canOpen ? 'disabled': '';
    }
  }

  Template.orders_by_producer.producers = function() {
    //TODO: filter producers that do not have orders through Orders.
    return Producers.find({});
  }

  Template.orders_by_producer.selected = function() {
    return Session.equals('rounds_products_for_producer', this._id) ? 'selected' : '';
  }
  Template.orders_by_producer.productName = function(selectedProductId) {
    console.log(selectedProductId);
    var actualProduct = Products.findOne({_id: selectedProductId});
    if (actualProduct != null) {
      return actualProduct.Name;
    }
    else 
    {
      console.log("No more product like this");
    }
  }

  Template.orders_by_producer.productName = function(selectedProductId) {
    //console.log(selectedProductId);
    var actualProduct = Products.findOne({_id: selectedProductId});
    if (actualProduct != null) {
      return actualProduct.Name;
    }
    else 
    {
      console.log("No more product like this");
    }
  }

  Template.orders_by_producer.amount = function(selectProductId) {
    //TODO refactor this and below to have only one method
    var selectPackageSize = this.Amount;
    var amount = 0;
    //var selectProductId = this.ProductId;
    var currentRoundId = Session.get('admin_selected_order_round');
    //This does not work currently

    var shoppingCartWithProduct = Orders.find({OrderRoundId: currentRoundId}, { Products: { $elemMatch: {ProductId: selectProductId}}});
    //var shoppingCartWithProduct = Meteor.call('OrdersWithProductAndPackage', currentRoundId, selectedProductId, selectedPackageSize);
    //console.log(shoppingCartWithProduct);
    shoppingCartWithProduct.forEach(function(cart) {
      //console.log("Cart: "+cart);
      var products = cart.Products;
      products.forEach(function(product){
        //console.log("Comparing: "+product.ProductId+",  to "+selectProductId);
        //var result = (product.ProductId == this.ProductId);
        //There is a bug in Meteor mongodb mini, it 
        //console.log(product.ProductPackageSize+" ? "+selectPackageSize)
        if (product.ProductId == selectProductId && product.ProductPackageSize == selectPackageSize) {
          amount = amount+product.ProductAmount;
        }
        else {
          //TODO: what for new release with the bug fixed with $elemMatch funct
          console.log("So got also something that should not be");
        }
      }); 
    });
    return amount;
  }

  Template.orders_by_producer.total = function(selectProductId) {
    var selectPackageSize = this.Amount;
    var total = 0;
    var currentRoundId = Session.get('admin_selected_order_round');
    //TODO: elemmatch is not supported by Meteor mongodb mini, so if hack in the loop
    var shoppingCartWithProduct = Orders.find({OrderRoundId: currentRoundId}, { Products: { $elemMatch: {ProductId: selectProductId}}});
    shoppingCartWithProduct.forEach(function(cart) {
      //console.log("Cart: "+cart);
      var products = cart.Products;
      products.forEach(function(product){
        if (product.ProductId == selectProductId && product.ProductPackageSize == selectPackageSize) {
          total = total+(product.ProductAmount*product.ProductPrice*product.ProductPackageSize);
        }
        else {
          //TODO: what for new release with the bug fixed with $elemMatch funct
          //console.log("So got also something that should not be");
        }
      }); 
    });
    return roundToOneDecimal(total);
  }

  Template.orders_by_producer.unit = function(selectProductId) {
    var unit;
    var currentRoundId = Session.get('admin_selected_order_round');
    var shoppingCartWithProduct = Orders.find({OrderRoundId: currentRoundId}, { Products: { $elemMatch: {ProductId: selectProductId}}});
    shoppingCartWithProduct.forEach(function(cart) {
      var products = cart.Products;
      products.forEach(function(product){
        if (product.ProductId == selectProductId) {
          unit = product.ProductUnit;
        }
        else {
          //TODO: what for new release with the bug fixed with $elemMatch funct
          //console.log("So got also something that should not be");
        }
      }); 
    });
    return unit;
  }

  Template.orders_by_producer.price = function(selectProductId) {
    var price;
    var currentRoundId = Session.get('admin_selected_order_round');
    var shoppingCartWithProduct = Orders.find({OrderRoundId: currentRoundId}, { Products: { $elemMatch: {ProductId: selectProductId}}});
    shoppingCartWithProduct.forEach(function(cart) {
      //console.log("Cart: "+cart);
      var products = cart.Products;
      products.forEach(function(product){
        if (product.ProductId == selectProductId) {
          price = product.ProductPrice;
        }
        else {
          //TODO: what for new release with the bug fixed with $elemMatch funct
          //console.log("So got also something that should not be");
        }
      }); 
    });
    return price;
  }



  Template.orders_by_producer.products = function() {
    var producerId = Session.get('rounds_products_for_producer');
    var currentRoundId = Session.get('admin_selected_order_round');
    if (producerId != null && currentRoundId != null) {
      var productsForProducer = OrderRounds.find({parent: currentRoundId, ProducerId: producerId});
      //console.log(productsForProducer);
      return productsForProducer;
    }
  }

  Template.orders_by_producer.products_price = function() {
    var producerId = Session.get('rounds_products_for_producer');
    var currentRoundId = Session.get('admin_selected_order_round');
    var price = 0;
    if (producerId != null && currentRoundId != null) {
      var productsForProducer = OrderRounds.find({parent: currentRoundId, ProducerId: producerId});
      productsForProducer.forEach(function(product) {
        //console.log(product.ProductId);
        var shoppingCartWithProduct = Orders.find({OrderRoundId: currentRoundId}, { Products: { $elemMatch: {ProductId: product.ProductId}}});
        shoppingCartWithProduct.forEach(function(cart) {
          //console.log("Cart: "+cart);
          var userProducts = cart.Products;
          userProducts.forEach(function(userProduct){
            if (product.ProductId == userProduct.ProductId) {
              //console.log("Product: "+userProduct.ProductName+", #"+userProduct.ProductAmount+", Price: "+userProduct.ProductPrice)
              price = price+(userProduct.ProductAmount*userProduct.ProductPrice*userProduct.ProductPackageSize);
            }
          }); 
        });
      });
    }
    return roundToOneDecimal(price);
  }

  Template.orders_by_orderer.shopping_carts = function() {
    var currentRoundId = Session.get('admin_selected_order_round');
    if (currentRoundId != null) {
      var orders = Orders.find({ OrderRoundId: currentRoundId});
      return orders;
    }
  } 

  Template.orders_by_orderer.user_name = function(userId)
  {
    var theUser = Meteor.users.findOne({_id: userId});
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

  Template.orders_by_orderer.isReadyForDelivery = function() {
    var cart = Orders.findOne({_id: this._id});
    var status = cart.Status;

    return status >= READY_FOR_DELIVERY ? 'checked': '';
  }

  Template.orders_by_orderer.isDeliveryComplete  = function() {
    var cart = Orders.findOne({_id: this._id});
    var status = cart.Status;

    return status >= DELIVERY_COMPLETE ? 'checked': '';
  }

    Template.orders_by_orderer.isPaymentComplete  = function() {
    var cart = Orders.findOne({_id: this._id});
    var status = cart.Status;

    return status >= PAYMENT_COMPLETE ? 'checked': '';
  }

  Template.users_shopping_cart.cart = function() {
    var user_id = Session.get('rounds_products_for_orderer');
    if (user_id != null) { 
      var myOrders = Orders.findOne( {
        OrderRoundId: Session.get('admin_selected_order_round'),
        UserId: user_id
      });
      return myOrders;
    }
  }

  Template.users_shopping_cart.products_price = function() {
    return getShoppingCartsTotal(this.UserId, Session.get('admin_selected_order_round'));
  }

  Template.users_shopping_cart.isReadyForDelivery = function() {
    var cart = Orders.findOne({_id: this._id});
    if (cart != null) {
      var status = cart.Status;
      if (status == null) {
        return 'btn-primary';
      }
      else {
        //console.log(deliveryStatus);
        return status >= READY_FOR_DELIVERY? 'btn-success': 'btn-primary';
      }
    }
  }

  Template.users_shopping_cart.isDeliveryComplete = function() {
    var cart = Orders.findOne({_id: this._id});
    if (cart != null) {
      var status = cart.Status;
      return status >= DELIVERY_COMPLETE? 'btn-success': 'btn-primary';
    }
    return 'btn-primary';
  }

  Template.users_shopping_cart.isPaymentComplete = function() {
    var cart = Orders.findOne({_id: this._id});
    if (cart != null) {
      var status = cart.Status;
      return status >= PAYMENT_COMPLETE? 'btn-success': 'btn-primary';
    }
    return 'btn-primary';
  }

  Template.order_rounds.order_rounds = function() {
    return OrderRounds.find({parent: null}, {sort: {Name: -1}});
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

  Template.products_for_round.productOrCategorySelected = function() {
    if (!Session.equals('current_producer_for_round', null)) {
      return true;
    }
    else {
      if (!Session.equals('current_category_for_round', null)) {
        return true;
      }
      else {
        return false;
      }
    }
  }

  Template.products_for_round.productChildrenSelected = function() {
    var roundProductsForProducer = OrderRounds.find({parent: Session.get('admin_selected_order_round'), ProducerId: this._id });
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
      //console.log("Count: "+amountInRound);
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

    return productInRound == undefined ? '':'checked';
  }

  Template.order_rounds.roundSelected = function() 
  {
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
    var selectedRoundId = Session.get('admin_selected_order_round');
    if (selectedRoundId != null) {
      var orderRound = OrderRounds.findOne({_id: selectedRoundId});
      if (orderRound != null) {
        var deadline = orderRound.RoundDeadline;
        if (deadline != null) {
          var hours = deadline.getHours();
          var minutes = deadline.getMinutes();
          return formatTime(hours, minutes);
        }
      }
    }
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
  Template.product.totalPrice = function(amount, price) {
    return amount*price;
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
    'blur .producer_name':function(event,context) {
        Producers.update(this._id, {$set:{Name : event.target.value}});
    },
    'blur .producer_email' : function(event, context) {
        Producers.update(this._id, {$set: {Email: event.target.value}});
    },
    'click .add_product': function() {
      //TODO: Fix hack solution with .toString. What is the object id with attribute?
        Products.insert({Name : "Uusi tuote", Producer_id: Session.get('current_producer'), PriceIsAccurate: true, ProductPackages: [ ]}, 
          function(err, newItem) {
            Products.update(newItem.toString(), {$push: {ProductPackages: {ParentId: newItem.toString(), Amount: 1, _id: new Meteor.Collection.ObjectID()}}});
            Session.set('current_product', newItem.toString());
          }
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
    'blur .product_description': function(event, context) {
        Products.update(this._id, {$set: {Description: event.target.value}});
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
    'change .price-form-control': function(event, context) {
      var current_product_id = Session.get('current_product');
      var priceTypeText = event.target.value;
      var isAccurate = false;
      if (priceTypeText == accuratePrice)
      {
        isAccurate = true;
      }
      Products.update(current_product_id, {$set: {PriceIsAccurate: isAccurate}});
    },
    'click .add_size_unit' : function(event, contect) {
      Products.update(this._id, {$push: {ProductPackages: {ParentId: this._id, Amount: 1, _id: new Meteor.Collection.ObjectID()}}});
    },
    'click .remove_package' : function(event, context) {
      Products.update(this.ParentId, {$pull: {ProductPackages: { _id : this._id}}});
    },
    'blur .package_size' : function(event, context) {
      Meteor.call('updateProductPackageAmount', this.ParentId, this._id, event.target.value);
    }
  });

  Template.new_category.events({
    'click .add_category' : function (event, context) {
      Categories.insert({Name : context.find("input").value});
    },
  });

  Template.users.events({
    'click .allow_order' : function() {
      Meteor.users.update({_id: this._id}, {$set: {role: 'normal'}});
    },
    'click .allow_admin' : function() {
      Meteor.users.update({_id: this._id}, {$set: {role: 'admin'}});
    },
    'click .remove_user' : function() {
      Meteor.call('removeAccount', this._id);
    }
  });

  Template.product_row.events({
    'click .add_basket' : function(event, context) {
        var packageSizeSelect = context.find('select');
        var addedPackageSize = packageSizeSelect.value;
        var addedProductId = this._id;
        var addedProductName = this.Name;
        var addedProductPrice = this.Price;
        var addedProductPriceIsAccurate = this.PriceIsAccurate;
        var addedProductUnit = this.Unit;
        var addedProductAmount = 1;

        updateCartForCurrentRound(addedProductId, addedProductName, addedProductPrice, addedProductPriceIsAccurate, addedPackageSize, addedProductUnit, addedProductAmount, true);
        event.preventDefault();
        return false;
    },
    'click .packageSize-form-control' : function(event) {
      event.preventDefault();
      return false;
    }
  });

  Template.shopping_cart_row.events({
    'blur .amount' : function(event, context) {
      var addedProductAmount = parseInt(context.find('input').value);
      if (addedProductAmount > 0) {
          var addedProductId = this.ProductId;
          var addedProductName = this.ProductName;
          var addedProductPrice = this.ProductPrice;
          var addedProductPriceIsAccurate = this.ProductPriceIsAccurate;
          var addedPackageSize = this.ProductPackageSize;
          var addedProductUnit = this.ProductUnit;
          updateCartForCurrentRound(addedProductId, addedProductName, addedProductPrice, addedProductPriceIsAccurate, addedPackageSize, addedProductUnit, addedProductAmount, false);
      }
      //If set to zero or negative, should remove
      else {
        Meteor.call('removeFromCart', Session.get('user_selected_order_round'), Meteor.userId(), this.ProductId, this.ProductPackageSize);
      }
    },
    'click .remove_product' : function(event, context) {
      Meteor.call('removeFromCart', Session.get('user_selected_order_round'), Meteor.userId(), this.ProductId, this.ProductPackageSize);
    }

  }); 

  Template.orders_by_orderer.events({
      'click .orderer-list-element' : function() {
      Session.set('rounds_products_for_orderer', this.UserId);
    }
  })

  Template.orders_by_producer.events({
    'click .producer-list-element': function() {
      //console.log("Click:"+this._id);
      Session.set('rounds_products_for_producer', this._id);
    }
  })

  Template.users_shopping_cart.events({
    'click .ready-for-delivery' : function() {
      //TODO: lock the UI for users cart also from admin side.
      setCartStatus(this._id, READY_FOR_DELIVERY);
    },
    'click .delivery-complete' : function() {
      setCartStatus(this._id, DELIVERY_COMPLETE);
    },
    'click .payment-complete' : function() {
      setCartStatus(this._id, PAYMENT_COMPLETE);
    }
  })

  Template.users_shopping_cart_row.events({
    'click .remove-product' : function(event, context) {
      Meteor.call('removeFromCart', Session.get('admin_selected_order_round'), Session.get('rounds_products_for_orderer'), this.ProductId);
    },
    'blur .totalPrice' : function(event, context) {
      var totalValue = parseInt(context.find('input').value);
      console.log(this);
      var amount = this.ProductAmount;
      var price = this.ProductPrice;
      var packageSize = this.ProductPackageSize;
      //Changing the amount instead of price, as this is only dynamic place
      //TODO: consider data model to change the actual price and have this visible for the producer.

      var newAmount = totalValue / price / packageSize;
      Meteor.call('updateCart', Session.get('admin_selected_order_round'), Session.get('rounds_products_for_orderer'), this.ProductId, '', '', false, this.ProductPackageSize, '', newAmount, false);
    
      //console.log("New amount: "+newAmount);
    }
  })

  Template.order_rounds.events({
    'click .add_round' : function() {
      OrderRounds.insert({Name: 'Uusi kierros', Open: false, RoundDeadlineTime: '20:00'});
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
      //Set all products for producers or category, depending which is selected
      var products;
      var currentProducer = Session.get('current_producer_for_round');
      var currentCategory = Session.get('current_category_for_round');

      if (currentProducer != null){
        products = Products.find({Producer_id: currentProducer},{sort: {Name: 1}});
      }
      else {
        products = Products.find({category_id: currentCategory},{sort: {Name: 1}});
      }

      products.forEach(function(product) {
        if (event.target.checked) {
         OrderRounds.insert(
         {
            parent: Session.get('admin_selected_order_round'),
            ProductId: product._id,
            ProductPackages: product.ProductPackages, 
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
     //If checkbox for product select, add to the current order round
      if (event.target.checked) {
        OrderRounds.insert(
          {
            parent: Session.get('admin_selected_order_round'),
            ProductId: this._id,
            ProductPackages: this.ProductPackages, 
            CategoryId: this.category_id,
            ProducerId: this.Producer_id
          }
          );
      }
      //If unselected should be in the curent round, so remove
      else {
        Meteor.call('removeProductFromRound', Session.get('admin_selected_order_round'), this._id);
      }
    }
  })

  Template.users_rounds.events( {
    'click .order_list_element' : function() {
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
    //If need to clean stuff enable these...
    //OrderRounds.remove({});
    //Orders.remove({});

    //If no users defined, create admin
    if (Meteor.users.find({}).count() == 0)
    {
        var options = {email: 'rami.ertimo@gmail.com', password: 'admin'};
        Accounts.createUser(options);
    }

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
        if (user.role == 'admin') {
          return Orders.find({});
        }
        else {
          return Orders.find({UserId: this.userId})
        }
      }
    });

    Meteor.publish("orderRounds", function() {
      return OrderRounds.find({});
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
    updateCart: function(currentRoundId, currentUser, addedProductId, addedProductName, addedProductPrice, addedProductPriceIsAccurate, addedPackageSize, addedProductUnit, amount, increment) {
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
            ProductPackageSize: addedPackageSize,
            ProductUnit : addedProductUnit,
            ProductPrice: addedProductPrice,
            ProductPriceIsAccurate: addedProductPriceIsAccurate
          }]
        }
        );
      }
      //User has made at least one order, update shopping cart
      else {
        var product = Orders.findOne({_id: shoppingCart._id, Products: {$elemMatch: {ProductId: addedProductId, ProductPackageSize:addedPackageSize}}});
        //If this product has been already added to cart
        if (product != null) 
        {
          //If amount set manually in Shopping cart
          if (!increment) 
          {
            Orders.update(
            {
              _id: shoppingCart._id,
              Products: {
                $elemMatch: {
                  ProductPackageSize:addedPackageSize,
                  ProductId: addedProductId
                }
              }
            },
            {$set: { "Products.$.ProductAmount" : amount }}
            );
          }
          //If amount added by one in Products
          else {
            Orders.update(
            {
              _id: shoppingCart._id,
              Products: {
                $elemMatch: {
                  ProductPackageSize:addedPackageSize,
                  ProductId: addedProductId
                }
              }
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
            ProductPackageSize: addedPackageSize,
            ProductUnit: addedProductUnit,
            ProductPrice: addedProductPrice,
            ProductPriceIsAccurate: addedProductPriceIsAccurate
          }}}
        );
      }
      }
    },
    removeFromCart: function(currentRoundId, currentUser, removedProductId, packageSize) {
      var shoppingCart = Orders.findOne({
        UserId: currentUser,
        OrderRoundId :currentRoundId
      });
      if (shoppingCart != null){
        Orders.update(
        {
          _id: shoppingCart._id,

        },
        {$pull: { Products : {  ProductId: removedProductId, ProductPackageSize: packageSize }}}
        );
      }

    },
    removeProductFromRound: function(orderRoundId, productId) {
      OrderRounds.remove({parent: orderRoundId, ProductId: productId});
    },
    createAccount: function(emailAddress, newPassword) {
      var options = {email: emailAddress, password: newPassword};
      Accounts.createUser(options);
    },
    removeAccount: function(id) {
      Meteor.users.remove( {_id: id });
    },
    updateProductPackageAmount: function(parentId, id, value) {
      Products.update(
      {
        _id: parentId, 
        "ProductPackages._id": id
      }, 
      {$set: { "ProductPackages.$.Amount": value}});
    },
    /*findOrders: function (roundId, productId, packageSize) {
      return Orders.find({OrderRoundId: roundId}, { Products: { $elemMatch: {ProductId: productId, ProductPackageSize: packageSize}}});
    }*/ 
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


//TODO: make autmmatic round closing work!
  Meteor.setInterval(function() {
    var openRounds = OrderRounds.find({Open: true});
    openRounds.forEach(function(round) {
      var currentDateAndTime = new Date();
      var openRoundDeadline = round.RoundDeadline;
      if (currentDateAndTime > openRoundDeadline)
      {
        OrderRounds.update({_id : round._id}, {$set: {Open: false, CanOpen: false}});
      }
    });
  }, 60000)



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