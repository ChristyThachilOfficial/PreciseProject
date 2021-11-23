const { response } = require("express");
var express = require("express");
const { Db } = require("mongodb");
const { AwsInstance } = require("twilio/lib/rest/accounts/v1/credential/aws");
var router = express.Router();
var productHelpers = require("../helpers/product-helpers");
const userHelpers = require("../helpers/user-helpers");

let admindetails = {
  name: "chris@gmail.com",
  pass: 000,
};

router.get("/otp", (req, res, next) => {
  res.render("admin/admin-otp", { typeOfPersonAdmin: true });
});

let adminLoginHelper = (req,res,next)=>{
  if(req.session.adminLogin){
    next();
  }else{
    res.redirect('/admin/login')
  }
}

/* GET admin home. */
router.get("/",adminLoginHelper, async(req, res, next)=> {
  let getOrderCountData = await productHelpers.getAllOrderCount()
  let totalUsers = await userHelpers.getUsersCount()
  let totalRevenue = await productHelpers.getTotalRevenue()
  let totalProducts=await productHelpers.getProductsCount()
  let totalBrands = await productHelpers.getBrandsCount()
  let totalOrdersByPaymentmethod =await productHelpers.totalOrdersByPaymentmethod()

  let orderDataArray = [getOrderCountData.totalOrders,getOrderCountData.totalCancelledOrder,getOrderCountData.totalDeliveredOrder,getOrderCountData.totalPlacedOrder]
  res.render("admin/admin-home", { admin: true, typeOfPersonAdmin: true ,totalUsers,totalRevenue,totalProducts,totalBrands,orderDataArray,totalOrdersByPaymentmethod});
});

//get admin login
router.get("/login", (req, res, next) => {
  if(req.session.adminLogin){
    res.redirect('/admin')
  }
  else if(req.session.adminLoginErr ){
    res.render('admin/admin-login',{typeOfPersonAdmin:true,loginErr:true})
    req.session.adminLoginErr=false
  }else{
    
    res.render("admin/admin-login", { typeOfPersonAdmin: true });
  }
 
});

//post admin login
router.post('/login',(req,res,next)=>{
  if(req.body.adminId == admindetails.name && req.body.password == admindetails.pass){
    req.session.adminLogin =true
    res.redirect('/admin')
  }else{
    req.session.adminLoginErr =true
    res.redirect('/admin/login')
  }
})

// view products
router.get("/viewproducts",adminLoginHelper, (req, res, next) => {
  productHelpers.getallProducts().then((products) => {
    res.render("admin/view-products", {
      typeOfPersonAdmin: true,
      admin: true,
      products,
    });
  });
});

// view users
router.get("/viewusers",adminLoginHelper, (req, res, next) => {
  userHelpers.getAllUsers().then((users) => {
    res.render("admin/view-users", {
      admin: true,
      typeOfPersonAdmin: true,
      users,
    });
  });
});

//block users
router.get("/blockusers/:id",adminLoginHelper, (req, res, next) => {
  let userId = req.params.id;
  userHelpers.blockUser(userId).then((response) => {
    res.redirect("/admin/viewusers");
  });
});

//unblock users
router.get("/unblockusers/:id",adminLoginHelper, (req, res, next) => {
  let userId = req.params.id;
  userHelpers.unblockUser(userId).then((response) => {
    res.redirect("/admin/viewusers");
  });
});

// ADD products
router.get("/addproduct",adminLoginHelper,async (req, res, next) => {
  let category=await productHelpers.getAllCategory()
  res.render("admin/add-product", { admin: true, typeOfPersonAdmin: true ,category });
});

// POST add products
router.post("/addproduct",adminLoginHelper, (req, res, next) => {
  productHelpers.addProduct(req.body).then((id) => {
    let image1 = req.files.image1;
    let image2 = req.files.image2;
    let image3 = req.files.image3;

    image1.mv("../ProjectClone22/public/productImages/" + id + "__1.jpg");
    image2.mv("../ProjectClone22/public/productImages/" + id + "__2.jpg");
    image3.mv("../ProjectClone22/public/productImages/" + id + "__3.jpg");

    res.redirect("/admin/addproduct");
  });
});

//delete product
router.get("/deleteproducts/:id",adminLoginHelper, (req, res, next) => {
  let proId = req.params.id;
  productHelpers.deleteProduct(proId).then((result) => {
    res.redirect("/admin/viewproducts");
  });
});

//edit product
router.get("/editproducts/:id",adminLoginHelper, async (req, res, next) => {
  let category=await productHelpers.getAllCategory()
  let product = await productHelpers.getProductDetails(req.params.id);
  res.render("admin/edit-product", {
    product,
    typeOfPersonAdmin: true,
    admin: true,
    category
  });
});

//edit product post
router.post("/editproducts/:id",adminLoginHelper, (req, res, next) => {
  
  productHelpers.updateproductDetails(req.params.id, req.body).then(() => {
    res.redirect("/admin/viewproducts");
    if (req.files.image1 || req.files.image2 || req.files.image3) {
      let image1 = req.files.image1;
      let image2 = req.files.image2;
      let image3 = req.files.image3;

      image1.mv(
        "../ProjectClone/public/productImages/" + req.params.id + "__1.jpg"
      );
      image2.mv(
        "../ProjectClone/public/productImages/" + req.params.id + "__2.jpg"
      );
      image3.mv(
        "../ProjectClone/public/productImages/" + req.params.id + "__3.jpg"
      );
    }
  });
}),
  //order management
  router.get("/order-management", adminLoginHelper,(req, res, next) => {
    userHelpers.getOrderList().then((orders) => {
      res.render("admin/admin-orderManagement", {
        typeOfPersonAdmin: true,
        admin: true,
        orders,
      });
    });
  });

  //sales report
  router.get("/salesReport",adminLoginHelper, (req, res, next) => {
    userHelpers.getOrderList().then((orders) => {
      let todayDate = new Date().toISOString().slice(0,10)
      res.render("admin/admin-salesReport", {
        typeOfPersonAdmin: true,
        admin: true,
        orders,
        todayDate
      });
    });
  });

  //post sales report to get orders between dates
  router.post('/totalSalesBetweenDates',adminLoginHelper,async(req,res,next)=>{
    console.log(req.body)
    let startDate = req.body.startDate
    let endDate = req.body.endDate
    
    if (req.body.list === 'totalOrders') {
      let totalOrders = await userHelpers.getOrderList()

   let filteredItems = totalOrders.filter((item, index) => item.date >=  startDate && item.date <= endDate);
   let SortedArray = filteredItems.sort((a,b)=>{
     return  new Date(b.date) - new Date(a.date) ;
   })
   let todaysDate = new Date().toISOString().slice(0,10)
   res.render('admin/admin-filteredOrders',{typeOfPersonAdmin:true,admin:true,totalOrders:true,SortedArray,todaysDate}) 
    }else if(req.body.list === 'deliveredOrders'){
     let totalDeliveredOrder=await productHelpers.getDeliveredOrders()
     let filteredItems = totalDeliveredOrder.filter((item,index)=> item.date >= startDate && item.date <= endDate)
     let SortedArray = filteredItems.sort((a,b)=>{
       return new Date(a.date) - new Date(b.date)
     })
     res.render('admin/admin-filteredOrders',{typeOfPersonAdmin:true,admin:true,delivered:true,SortedArray}) 
    }else if (req.body.list === 'cancelled') {
      let totalCancelledOrder = await productHelpers.getCancelledOrders()
      let filteredItems = totalCancelledOrder.filter((item,index)=> item.date >= startDate && item.date <= endDate)
      let SortedArray = filteredItems.sort((a,b)=>{
        return new Date(a.date) - new Date(b.date)
      })
      res.render('admin/admin-filteredOrders',{typeOfPersonAdmin:true,admin:true,cancelled:true,SortedArray})
    }else if(req.body.list === 'returnedOrders'){
      let todaysDate = new Date().toISOString().slice(0,10)
      let totalReturnedOrder = await  productHelpers.getReturnedOrders()
      let filteredItems = totalReturnedOrder.filter((item,index)=> item.date >= startDate && item.date <= endDate)
      let SortedArray = filteredItems.sort((a,b)=>{
        return new Date(a.date) - new Date (b.date)
      })
      
      res.render('admin/admin-filteredOrders',{typeOfPersonAdmin:true,admin:true,returned:true,SortedArray,todaysDate})
    }
    
  })

  //coupons
  router.get('/coupons',adminLoginHelper,(req,res,next)=>{
    let todayDate = new Date().toISOString().slice(0,10)
    if(req.session.couponExists){
      userHelpers.getAllCoupons().then((coupons)=>{
        res.render('admin/admin-coupons',{typeOfPersonAdmin:true,admin:true,coupons,couponExists:true,todayDate})
        req.session.couponExists = false
      })
    }else{
      userHelpers.getAllCoupons().then((coupons)=>{
        res.render('admin/admin-coupons',{typeOfPersonAdmin:true,admin:true,coupons,todayDate})
      })
    }
  
    
  })
  
  //add coupons
  router.post('/addCoupons',adminLoginHelper,(req,res,next)=>{
    req.body.percentage =parseInt(req.body.percentage)
    userHelpers.addCoupons(req.body).then((response)=>{
      console.log(response)
     if( response.yesItExists){
       req.session.couponExists = true
       res.redirect('/admin/coupons')
     }else{
      res.redirect('/admin/coupons')
     }
     
     
    })
  })

  //delete coupons
  router.get('/deleteCoupon/:id',adminLoginHelper,(req,res,next)=>{
    userHelpers.deleteCoupon(req.params.id).then(()=>{
      res.json({status:true})
    })
  })

//order status update
router.get("/change-status/:orderId/:status", adminLoginHelper,(req, res, next) => {
  userHelpers
    .changeOrderStatus(req.params.orderId, req.params.status)
    .then(() => {
      res.json({ status: true });
    });
});



router.get("/view-orderedproduct/:orderId",adminLoginHelper, async (req, res, next) => {
  let orderId=req.params.orderId
  let orderStatus=await userHelpers.getOrderStatus(orderId)
  let order =await userHelpers.findOrder(orderId)
  if (order.mode==='cart') {
    let products = await userHelpers.getOrderProducts(req.params.orderId);
    res.render("admin/admin-userorederproducts", {
      typeOfPersonAdmin: true,
      admin: true,
      products,
      orderId,
      orderStatus,
      cart:true
    });
  }else if (order.mode==='buynow') {
    let products = await productHelpers.buyNowProduct(orderId)
    res.render("admin/admin-userorederproducts", {
      typeOfPersonAdmin: true,
      admin: true,
      products,
      orderId,
      orderStatus,
      buynow:true
    });
  }

 
});

router.post('/updateOrderStatus',adminLoginHelper,(req,res,next)=>{
  
  userHelpers.changeOrderStatus(req.body.proId,req.body.orderId,req.body.status).then((response)=>{
    res.json(response)
  })
})

//Get add catetory
router.get('/addcategory',adminLoginHelper,(req,res,next)=>{
  if( req.session.categoryExists){
    productHelpers.getAllCategory().then((category)=>{
      res.render('admin/admin-addCategory',{typeOfPersonAdmin:true,admin:true,category,categoryExists:true})
      req.session.categoryExists = false
    })
  }else{
    productHelpers.getAllCategory().then((category)=>{
      res.render('admin/admin-addCategory',{typeOfPersonAdmin:true,admin:true,category})
    })
  }
 
 
})

//post add category
router.post('/addCategory',adminLoginHelper,(req,res,next)=>{
  productHelpers.addCategory(req.body.category).then((response)=>{
    if(response.yesItExists){
      req.session.categoryExists = true
      res.redirect('/admin/addcategory')
    }else{
      res.redirect('/admin/addcategory')
    }
    
  })
})

//delete category
router.get('/deleteCategory/:id',adminLoginHelper,(req,res,next)=>{
  productHelpers.deleteCategory(req.params.id).then(()=>{
    res.json({status:true})
  })
})

//delivered orders sales report
router.get('/deliveredOrders',adminLoginHelper,(req,res,next)=>{
  productHelpers.getDeliveredOrders().then((totalDeliveredOrder)=>{
    let todayDate = new Date().toISOString().slice(0,10)
    console.log(totalDeliveredOrder)
    res.render('admin/admin-deliveredSalesReport',{typeOfPersonAdmin:true,admin:true,totalDeliveredOrder,todayDate})
  })
})

//cancelled orders sales report
router.get('/cancelledOrders',adminLoginHelper,(req,res,next)=>{
  productHelpers.getCancelledOrders().then((totalCancelledOrder)=>{
    let todayDate = new Date().toISOString().slice(0,10)
    res.render('admin/admin-cancelledSalesReport',{typeOfPersonAdmin:true,admin:true,totalCancelledOrder,todayDate})
  })
})

//returned order sales report
router.get('/returnedOrders',adminLoginHelper,(req,res,next)=>{
  productHelpers.getReturnedOrders().then((totalReturnedOrder)=>{
    let todayDate = new Date().toISOString().slice(0,10)
    res.render('admin/admin-returnedSalesReport',{typeOfPersonAdmin:true,admin:true,totalReturnedOrder,todayDate})
  })
})



//brand offer managent
router.get('/brandOffers',adminLoginHelper,async (req,res,next)=>{
  let category=await productHelpers.getAllCategory()
  let allBrandOffers = await productHelpers.getAllBrandOffers()
  let todayDate = new Date().toISOString().slice(0,10)
  if ( req.session.brandOfferExists) {
    res.render('admin/admin-brandOffers',{typeOfPersonAdmin:true,admin:true,category,allBrandOffers,brandOfferExists:true,todayDate})
    
     req.session.brandOfferExists= false
  }else{
    res.render('admin/admin-brandOffers',{typeOfPersonAdmin:true,admin:true,category,allBrandOffers,todayDate})
  }
  
})

//add brand offer
router.post('/addBrandOffer',adminLoginHelper,(req,res,next)=>{ 
  req.body.percentage = parseInt(req.body.percentage)
  productHelpers.addBrandOffer(req.body).then((response)=>{
    if(response.unavailable){
    
    res.redirect('/admin/brandOffers')
    }else if(response.exists){
        req.session.brandOfferExists = true
        res.redirect('/admin/brandOffers')
      }else {

        //maping the brand products
        response.map((data)=>{
          productHelpers.updateProductOfferDetails(data)
        })
        res.redirect('/admin/brandOffers')
      }
     
     
    
   
  })
 
})

//delete product offer
router.get('/deleteBrandOffer/:prodOfferId/:brand',adminLoginHelper,(req,res,next)=>{
  console.log('req.params.prodOfferId,req.params.brand',req.params.prodOfferId,req.params.brand)
  productHelpers.deleteBrandOffer(req.params.prodOfferId,req.params.brand).then((brandProducts)=>{
    brandProducts.map((data)=>{
      productHelpers.updatePriceToRealPrice(data)
    })
    res.json({status:true})
  })
})

//get product offers
router.get('/productOffers',adminLoginHelper,async(req,res,next)=>{
  let products = await productHelpers.getAllProductNames()
  let offerProductsData = await productHelpers.getAllProductsOfferData()

  if(req.session.productOfferExists){
    res.render('admin/admin-productOffers',{typeOfPersonAdmin:true,admin:true,products,productOfferAlreadyExists:true,offerProductsData})
    req.session.productOfferExists = false
  }else{
    res.render('admin/admin-productOffers',{typeOfPersonAdmin:true,admin:true,products,offerProductsData})
  }
  
})

//post product offers
router.post('/addProductOffer',adminLoginHelper,(req,res,next)=>{
  productHelpers.addProductOffer(req.body).then((response)=>{
    if(response){
      res.redirect('/admin/productOffers')
    }else{
      
      req.session.productOfferExists = true
      res.redirect('/admin/productOffers')
    }
    
  })
 
})

//delete product offer
router.get('/deleteProductOffer/:productOfferId/:productName',adminLoginHelper,(req,res,next)=>{
  console.log('what is happening right now ',req.params.productOfferId,req.params.productName)
  productHelpers.deleteProductOffer(req.params.productOfferId,req.params.productName).then(()=>{
    res.json({status:true})
  })
})

//advertisement management
router.get('/advertisementManagement',adminLoginHelper,async(req,res,next)=>{
  let allBrandOffers = await productHelpers.getAllBrandOffers()
  let allAds = await productHelpers.getAllAdvertisement()
  console.log(allAds)
  
  res.render('admin/admin-adManangement',{typeOfPersonAdmin:true,admin:true,allBrandOffers,allAds})
})


//post advertisement
router.post('/addAdvertisement',adminLoginHelper,(req,res,next)=>{
  productHelpers.addAdvertisement(req.body).then((id)=>{
    let image = req.files.offerImage
   
    image.mv("../ProjectClone22/public/userImages/" + id + ".jpg")
    res.redirect('/admin/advertisementManagement')
  })
})

//delete advertisement
router.get('/deleteAdvertisement/:AdId',adminLoginHelper,(req,res,next)=>{
  productHelpers.deleteAdvertisement(req.params.AdId).then((response)=>{
    res.json(response)
  })
})

//admin logout
router.get('/logout',(req,res,next)=>{
  req.session.adminLogin=false
  res.redirect('/admin/login')
})




module.exports = router;
