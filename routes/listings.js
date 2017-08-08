var express = require('express');
var router = express.Router();
var depts = require('../bin/departments');
var postgresModel = require('../models/postgres.js');
var hbs = require('hbs');
var paginate = require('handlebars-paginate');

hbs.registerHelper('paginate', paginate);
hbs.registerHelper('split-depts', function(str) {
  str = hbs.Utils.escapeExpression(str);
  for (var i = 0; i < str.length; i++) {
    str = str.replace(';', "</br>");
  }
  return new hbs.SafeString(str)
});

hbs.registerHelper('paginate-link', function(url, pageNum) {
  //important - page number parameter must be last in url for this to work

  if (url.indexOf('?') > -1) { //contains params
    if (url.indexOf('?p=') > -1) {    // already contains page number param
      return url.substring(0, url.indexOf('?p=')) + "?p=" + pageNum.toString();
    } else if (url.indexOf('&p=') > -1){  // already contains page number and other params
      return url.substring(0, url.indexOf('&p=')) + "&p=" + pageNum.toString();
    } else {
      return url + "&p=" + pageNum.toString();
    }
  } else {
    return url + "?p=" + pageNum.toString();
  }

});

hbs.registerHelper('json', function(context) {
  return JSON.stringify(context);
});

function listAll(req, res) {

  console.log(req.session);

  if (!req.session.loggedin) res.redirect('/users'); //if user info not loaded, redirect to users route

  var callback = function(listings) {

  res.render('listings', {
      title: 'Listings',
      searchPlaceholder: req.query.search || '',
      deptPlaceholder: req.query.departments || 'Departments',
      depts: depts,
      listings: listings.slice((req.query.p - 1) * resultsPerPage || 0, req.query.p * resultsPerPage || resultsPerPage), //gets entries for current page
      numberOfResults: listings.length,
      url: req.url,
      pagination: {
        page: req.query.p || 1,
        pageCount: Math.ceil(listings.length / resultsPerPage),
      }
    });
  };
  var resultsPerPage = req.query.limit || 10;
  var maxresultsPerPage = 50;
  //set max resultsPerPage to 50
  if (req.query.limit > maxresultsPerPage) {
    resultsPerPage = maxresultsPerPage;
  }
  if (req.query.search) {
    if (req.query.departments && req.query.departments != "Departments") {
      postgresModel.searchANDfilter(req.query.search, req.query.departments, req.session.cas_user, req.query.sort, callback);
    } else {
      postgresModel.searchListings(req.query.search, req.session.cas_user, req.query.sort, callback);
    }
  } else {
    if (req.query.departments && req.query.departments != "Departments") {
      postgresModel.filterDepts(req.query.departments, req.session.cas_user, req.query.sort, callback);
    } else {
      postgresModel.getAllListings(req.session.cas_user, req.query.sort, callback);
    }
  }
}

//GET home page.
router.get('/listings', listAll);

router.post('/listings/addFavorite/:listingid',function(req,res){
  postgresModel.addFavorite(req.session.cas_user, req.params.listingid, function(log) {
    console.log('Entry  '+ req.params.listingid.toString() +' Added To Favorites');
  });
  res.redirect('/listings');
});

router.post('/listings/removeFavorite/:listingid',function(req,res){
  console.log(req.params.listingid);
  postgresModel.removeFavorite(req.session.cas_user, req.params.listingid, function(log) {
    console.log('Entry '+ req.params.listingid.toString() +' Removed From Favorites');
  });
  res.redirect('/listings');
});

module.exports = router;

/**
hbs.registerHelper('truncate-desc', function(str, isTruncate) {
    var len = 600;
    if (str && isTruncate) {
        if (str.length > len && str.length > 0) {
            var new_str = str + " ";
            new_str = str.substr(0, len);
            new_str = str.substr(0, new_str.lastIndexOf(" "));
            new_str = (new_str.length > 0) ? new_str : str.substr(0, len);
            return new hbs.SafeString(new_str + '...');
        }
    }
    return new hbs.SafeString(str);
});
**/
