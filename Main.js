	//Modulos
	var http = require('http');
	var shajs = require('sha.js');
	var https = require('https');
	var pg = require('pg');
	var request = require('request');
	var CronJob = require('cron').CronJob;

	//Conexion con la base de datos
	var connectionString = process.env.DATABASE_URL || 'postgres://postgres:BBCCDB@localhost:5432/postgres';
	var client = new pg.Client(connectionString);
	client.connect();

	//Aqui el tiempo
	var tiempo=new Date().toISOString().split('.')[0]+"Z";
	//Aqui la firma
	var firma= shajs('sha256').update('c4fb951e-620c-4359-a3a9-f1e79e1d7392,0d1a7366-a9db-444e-84f0-41539993b16e,'+tiempo+'').digest('hex');
	//Aqui el url de la descripcion del producto
	var urldescripcion = 'https://intcomex-prod.apigee.net/v1/getcatalog?apiKey=c4fb951e-620c-4359-a3a9-f1e79e1d7392&utcTimeStamp='+tiempo+'&signature='+firma;
	//Aqui el url del precio del producto
	var urlprecios = 'https://intcomex-prod.apigee.net/v1/getcatalogsalesdata?apiKey=c4fb951e-620c-4359-a3a9-f1e79e1d7392&utcTimeStamp='+tiempo+'&signature='+firma;
	var options1 = {  
    url: urldescripcion,
    method: 'GET',
    headers: {
        'Accept': 'application/json',
        'Accept-Charset': 'utf-8',
        'User-Agent': 'my-reddit-client'
    }
};
		request(options1, function insertar1(err, res, body) {  
			client.query('TRUNCATE TABLE descripcion', function(err, result) {
      			if(err) {
            		console.log(err);
      			} else {
            		console.log(result);
     			}	
});
    var json = JSON.parse(body);
    var jsonm = JSON.stringify(json);
	var users1 = jsonm.toLowerCase();

	client.query('INSERT INTO descripcion (sku, mpn, manufacturer, brand, category, type, new, upc, description) ' +
        'SELECT m.* FROM json_populate_recordset(null::descripcion, $1) AS m',
		[users1], function(err, result) {

      if(err) {
            console.log(err);
      } else {
            console.log(result);
      }
});

	//Se realiza la funcion cada 3 minutos
	new CronJob('0 0 */3 * * *', function() {
		
			insertar1(err, res, body);
			console.log('insertar1');
}, null, true);
});

var options2 = {  
    url: urlprecios,
    method: 'GET',
    headers: {
        'Accept': 'application/json',
        'Accept-Charset': 'utf-8',
        'User-Agent': 'my-reddit-client'
    }
};

request(options2, function insertar2(err, res, body) {  
			client.query('TRUNCATE TABLE precios', function(err, result) {
      			if(err) {
            		console.log(err);
      			} else {
            		console.log(result);
     			}	
});
    var json = JSON.parse(body);
    var jsonm = JSON.stringify(json);
	  var users2 = jsonm.toLowerCase();

client.query('INSERT INTO precios ( sku, price, locations, instock,onsale,moneda) ' +
    'SELECT m.* FROM json_populate_recordset(null::precios, $1) AS m',
		[users2], function(err, result) {
      if(err) {
            console.log(err);
      } else {
      	console.log("aqui");
            console.log(result);
      }
});

			client.query("update precios set moneda = price;"+
			"update precios set price= regexp_replace(price, '[^0-9/.]+', '','g');"+
			"update precios set moneda = regexp_replace(moneda, '[^a-zA-Z]+', '','g');"+
			"update precios set moneda = replace(moneda,'unitpricecurrencyid','');"	, function(err, result) {
      			if(err) {
            		console.log(err);
      			} else {
            		console.log(result);
     			}	
});

			client.query('TRUNCATE TABLE productos', function(err, result) {
      			if(err) {
            		console.log(err);
      			} else {
            		console.log(result);
     			}	
});
client.query('INSERT INTO productos (sku,mpn,price,moneda,instock,onsale,locations,manufacturer,brand,category,type,new,upc,description) '+
	'select d.sku,mpn,price::numeric,moneda,instock::integer,onsale,locations,manufacturer,brand,category,type,new,upc,description from descripcion d inner join precios p on d.sku=p.sku'
	, function(err, result) {
            if(err) {            
                console.log(err);
            } else {
                console.log(result);
          } 
});

client.query('update productos set brand = SPLIT_PART(brand,'+"'"+'"'+"'"+', 12);'+
'update productos set manufacturer = SPLIT_PART(manufacturer,'+"'"+'"'+"'"+', 4);'+
'update productos set subcategory = category;'+
'update productos set category = SPLIT_PART(category,'+"'"+'"'+"'"+', 8);'+
'update productos set subcategory = SPLIT_PART(subcategory, '+"'"+'"'+"'"+', 18);', function(err, result) {
            if(err) {       
                console.log(err);
            } else {
                console.log(result);
          } 
});

	//Se realiza la funcion cada 3 minutos
	new CronJob('0 0 */3 * * *', function() {
			console.log('insertar2');
			insertar2(err, res, body);

}, null, true);
});