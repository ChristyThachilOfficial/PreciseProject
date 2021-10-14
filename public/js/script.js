

function addToCart(proId,prodPrice){
    
    $.ajax({
        url:'/add-to-cart/'+proId+'/'+prodPrice,
    
        method:'get',
        success:(response)=>{
           if(response.status){
            let count=$('#cartCount').html()
            count=parseInt(count)+1
            $("#cartCount").html(count)
            
           }
        }
    })
}





