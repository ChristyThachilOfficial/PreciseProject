const { response } = require("express");
var express = require("express");
const { Db } = require("mongodb");
var router = express.Router();
var productHelpers = require("../helpers/product-helpers");
const userHelpers = require("../helpers/user-helpers");

let admindetails = {
  name: "admin",
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

  let orderDataArray = [getOrderCountData.totalOrders,getOrderCountData.totalCancelledOrder,getOrderCountData.totalDeliveredOrder,getOrderCountData.totalPlacedOrder]
  res.render("admin/admin-home", { admin: true, typeOfPersonAdmin: true ,totalUsers,totalRevenue,totalProducts,totalBrands,orderDataArray});
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
    res.redirect("/admin");
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
      res.render("admin/admin-salesReport", {
        typeOfPersonAdmin: true,
        admin: true,
        orders,
      });
    });
  });

  //coupons
  router.get('/coupons',adminLoginHelper,(req,res,next)=>{
    userHelpers.getAllCoupons().then((coupons)=>{
      res.render('admin/admin-coupons',{typeOfPersonAdmin:true,admin:true,coupons})
    })
    
  })
  
  //add coupons
  router.post('/addCoupons',adminLoginHelper,(req,res,next)=>{
    req.body.percentage =parseInt(req.body.percentage)
    userHelpers.addCoupons(req.body).then(()=>{
      res.redirect('/admin/coupons')
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
  
  userHelpers.changeOrderStatus(req.body.proId,req.body.orderId,req.body.status)
})

//Get add catetory
router.get('/addcategory',adminLoginHelper,(req,res,next)=>{
  productHelpers.getAllCategory().then((category)=>{
    res.render('admin/admin-addCategory',{typeOfPersonAdmin:true,admin:true,category})
  })
 
})

//post add category
router.post('/addCategory',adminLoginHelper,(req,res,next)=>{
  productHelpers.addCategory(req.body.category).then(()=>{
    res.redirect('/admin/addcategory')
  })
})

//delete category
router.get('/deleteCategory/:id',adminLoginHelper,(req,res,next)=>{
  productHelpers.deleteCategory(req.params.id).then(()=>{
    res.json({status:true})
  })
})


//admin logout
router.get('/logout',(req,res,next)=>{
  req.session.adminLogin=false
  res.redirect('/admin/login')
})




module.exports = router;
