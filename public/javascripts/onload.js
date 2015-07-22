$(function () {
  // auto active item in navbar
  var url = this.location.pathname;
  $("ul.nav a[href='" + url + "']").parent().addClass('active');
  $("ul.nav a[href='" + url.substring(1) + "']").parent().addClass('active');
  $('ul.nav a').filter(function() {return this.href == url;}).parent().addClass('active');
  
  $.material.init();
});
