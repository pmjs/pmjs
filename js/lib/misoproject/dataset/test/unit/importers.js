(function(global) {
  
  var Util  = global.Util;
  var Miso  = global.Miso || {};  

  function verifyImport(obj, strictData) {

    // check properties exist
    ok(typeof strictData._columns !== "undefined", "columns property exists");

    // check all caches exist
    ok(typeof strictData._rowPositionById !== "undefined", "row position by id cache exists");
    ok(typeof strictData._rowIdByPosition !== "undefined", "row id by position cache exists");
    ok(typeof strictData._columnPositionByName !== "undefined", "column position by name cache exists");
    ok(typeof strictData.length !== "undefined", "row count exists");

    // check row cache ids
    for (var i = 0; i < strictData.length; i++) {
      var id = strictData._rowIdByPosition[i];
      ok(i === strictData._rowPositionById[id], "row " + i + " id correctly cached");
    }

    // verify all rows have the proper amount of data
    _.each(strictData._columns, function(column) {
      ok(column.data.length === strictData.length, "row count for column " + column.name + " is correct.");
    });

    // Verify all column position have been set.
    _.each(strictData._columns, function(column, i) {
      ok(strictData._columnPositionByName[column.name] === i, "proper column position has been set");
    });

    checkColumnTypes(strictData);
  }

  function checkColumnTypes(strictData) {

    // check data size
    ok(strictData.length === 24, "there are 24 rows");
    ok(strictData._columns.length === 5, "there are 5 columns");

    // check column types
    ok(strictData._column('_id').type === "number", "_id is number type");
    ok(strictData._column('character').type === "string", "character is string type");
    ok(strictData._column('name').type === "string", "name is string type");
    ok(strictData._column('is_modern').type === "boolean", "is_modern is boolean type");
    ok(strictData._column('numeric_value').type === "number", "numeric_value is numeric type");
  }

  test("Basic Strict Import through Dataset API", 47, function() {
    var ds = new Miso.Dataset({ 
      data : Miso.alphabet_strict, 
      strict: true
    });
    _.when(ds.fetch()).then(function(){
      verifyImport(Miso.alphabet_strict, ds);
      equals(typeof ds.columns, "function", "columns is the function, not the columns obj");
    });
  });

  module("Column creation, coercion &amp; type setting");

  test("Manually creating a column", function() {
    var ds = new Miso.Dataset({ 
      columns : [
        { name : 'testOne' },
        { name : 'testTwo', type: 'time' }
      ] 
    });
    ok(ds._column('testOne').name === 'testOne', 'testOne column created');
    ok(ds._column('testTwo').name === 'testTwo', 'testTwo column created');
    ok(ds._column('testTwo').type === 'time', 'testTwo column has time type');
  });

  test("Manual column type override", function() {
    var ds = new Miso.Dataset({
      data : Miso.alphabet_strict,
      strict : true,
      columns : [
        { name : 'numeric_value', type : 'string' }
      ]
    });
    _.when(ds.fetch()).then(function(){
      ok(ds._column('numeric_value').type === "string", "numeric_value is type string");
      ok(_.uniq(ds._column('numeric_value').data)[0] === "1", "numeric_value has been coerced to string");
    });
  });

  test("Manual column type override", function() {
    var data = _.clone(Miso.alphabet_strict);
    data.columns[1].data = [];
    _(data.columns[0].data.length).times(function() {
      data.columns[1].data.push( moment() );
    });

    var ds = new Miso.Dataset({
      data : data,
      strict: true,
      columns: [
        { name : 'name', type : 'time' }
      ]
    });

    _.when(ds.fetch()).then(function(){
      ok(ds._column('name').type === "time", "name column has a type of time");
      //nasty check that it's a moment bject
      ok(ds._column('name').data[0].version === moment().version, "is a moment object");
    });
  });

  test("Manual column type override with extra properties", function() {

    var ds = new Miso.Dataset({
      data : [
        { 'character' : '12/31 2012' },
        { 'character' : '01/31 2011' }
      ],
      columns : [
        { name : 'character', type : 'time', format : 'MM/DD YYYY' }
      ]
    });
    _.when(ds.fetch()).then(function(){
      ok(ds._column('character').type === "time", "character column has a type of time");
      // verify format was properly coerced
      equals(ds._column('character').data[0].valueOf(), moment("12/31 2012", "MM/DD YYYY"));
    });
  });

  module("Obj Importer");
  test("Convert object to dataset", 46, function() {
    var ds = new Miso.Dataset({ data : Miso.alphabet_obj });
    _.when(ds.fetch()).then(function(){
      verifyImport(Miso.alphabet_obj, ds);
    });
  });

  test("Basic json url fetch through Dataset API", 46, function() {
    var url = "data/alphabet_strict.json";
    var ds = new Miso.Dataset({ 
      url : url, 
      jsonp : false, 
      strict: true,
      ready : function() {
        verifyImport({}, this);   
        start();
      }
    });
    ds.fetch();
    stop();
  });

  test("Basic json url fetch through Dataset API + url is a function", 46, function() {
    var ds = new Miso.Dataset({ 
      url : function() {
        return "data/alphabet_strict.json";
      }, 
      jsonp : false, 
      strict: true,
      ready : function() {
        verifyImport({}, this);   
        start();
      }
    });
    ds.fetch();
    stop();
  });

  test("Basic jsonp url fetch with Dataset API", 46, function() {
    var url = "data/alphabet_obj.json?callback=";
    var ds = new Miso.Dataset({ 
      url : url, 
      jsonp : true, 
      extract: function(raw) {
        return raw.data;
      },
      ready : function() {
        verifyImport({}, this); 
        start();
      }
    });
    ds.fetch();
    stop();
  });


  test("Basic delimiter parsing test with Dataset API", 46, function() {

    var ds = new Miso.Dataset({ 
      data : window.Miso.alphabet_csv,
      delimiter : ","
    });
    _.when(ds.fetch()).then(function(){
      verifyImport(Miso.alphabet_strict, ds);
    });
  });

  test("Basic delimiter parsing test with Dataset API via url", 46, function() {
    stop();
    var ds = new Miso.Dataset({ 
      url : "data/alphabet.csv",
      parser: Miso.Parsers.Delimited
    });

    ds.fetch({
      success: function() {
        verifyImport(Miso.alphabet_strict, this);  
        start();
      }
    });
  });

  test("Basic delimiter parsing test with custom separator with Dataset API", 46, function() {
    var ds = new Miso.Dataset({ 
      data : window.Miso.alphabet_customseparator,
      delimiter : "###"
    });
    _.when(ds.fetch()).then(function(){
      verifyImport(Miso.alphabet_strict, ds);
    });
  });

  test("Basic remote delimiter parsing test with custom separator with Dataset API", 46, function() {
    var ds = new Miso.Dataset({ 
      url : "data/alphabet_customseparator.json",
      delimiter : "###"
    });
    _.when(ds.fetch()).then(function(){
      verifyImport(Miso.alphabet_strict, ds);
      start();
    });
    stop();
  });

  test("Delimiter empty value override", 2, function() {
    var data = "Col1,Col2,Col3\n"+
               "1,2,3\n" +
               "1,,5\n" +
               "5,,4";
    
    var ds = new Miso.Dataset({
      data : data,
      delimiter : ",",
      emptyValue : "CAT"
    });
    ds.fetch({
      success : function() {
        equals(ds.column("Col2").data[1], "CAT");
        equals(ds.column("Col2").data[2], "CAT");
      }
    });
    
  });

  test("Delimiter error catching too many items", 1, function() {
    var data = "Col1,Col2,Col3\n"+
               "1,2,3\n" +
               "1,,4,5\n" +
               "5,3,4";
    try {
      var ds = new Miso.Dataset({
        data : data,
        delimiter : ","
      });
      ds.fetch();
    } catch(e) {
      ok(e.message.indexOf("Error while parsing delimited data on row 2. Message: Too many items in row") > -1);
    }
  });

  test("Delimiter skip rows", 1, function() {
    var data = "bla bla skip this!\n" +
               "Col1,Col2,Col3\n"+
               "1,2,3\n" +
               "1,4,5\n" +
               "5,3,4";
    var ds = new Miso.Dataset({
      data : data,
      delimiter : ",",
      skipRows : 1
    });

    ds.fetch({ success : function() {
      equals(ds.length, 3);
    }});
    
  });

  test("Delimiter skip rows 2", 1, function() {
    var data = "bla bla skip this!\n" +
               "bla bla skip this!\n" +
               "bla bla skip this!\n" +
               "Col1,Col2,Col3\n"+
               "1,2,3\n" +
               "1,4,5\n" +
               "5,3,4";
    var ds = new Miso.Dataset({
      data : data,
      delimiter : ",",
      skipRows : 3
    });

    ds.fetch({ success : function() {
      equals(ds.length, 3);
    }});
    
  });

  test("Delimiter error catching not enough items", 1, function() {
    var data = "Col1,Col2,Col3\n"+
               "1,2,3\n" +
               "1,5\n" +
               "5,3,4";
    try {
      var ds = new Miso.Dataset({
        data : data,
        delimiter : ","
      });
      ds.fetch();
    } catch(e) {
      equals(e.message, "Error while parsing delimited data on row 2. Message: Not enough items in row");
    }
  });

  module("Google Spreadsheet Support");
  function verifyGoogleSpreadsheet(d, obj) {

    ok(_.isEqual(
      _.keys(d._columnPositionByName), 
      _.keys(obj._columnPositionByName)
    ));
    ok(_.isEqual(
      d._rowIdByPosition.length, 
      obj._rowIdByPosition.length)
    );

    // ignoring id column, since that changes.
    for(var i = 1; i < d.length; i++) {
      ok(_.isEqual(d._columns[i].data, obj._columns[i].data), "Expected: "+d._columns[i].data + " Got: " + window.Miso.google_spreadsheet_strict._columns[i].data);
    }
  }

  test("Google spreadsheet dataset test", function() {
    
    var key = "0Asnl0xYK7V16dFpFVmZUUy1taXdFbUJGdGtVdFBXbFE";
    var worksheet = "1";

    var ds = new Miso.Dataset({
      importer: Miso.Importers.GoogleSpreadsheet,
      parser : Miso.Parsers.GoogleSpreadsheet,
      key : key,
      worksheet: worksheet,
      ready : function() {
        verifyGoogleSpreadsheet(this, window.Miso.google_spreadsheet_strict);
        start();
      }
    });
    ds.fetch();
    stop();
  });

  test("Google spreadsheet fast parsing", function() {
    var key = "0Asnl0xYK7V16dFpFVmZUUy1taXdFbUJGdGtVdFBXbFE";
    var sheetName = "States";

    var ds = new Miso.Dataset({
      key : key,
      sheetName : sheetName,
      fast : true,
      importer: Miso.Importers.GoogleSpreadsheet,
      parser : Miso.Parsers.GoogleSpreadsheet
    });
    stop();
    ds.fetch({
      success : function() {
        equals(ds.length, 6);
        ok(this._columns.length === 3);
        ok(_.isEqual(ds.column("State").data, ["AZ","AZ","AZ","MA","MA","MA"]));
        ok(_.isEqual(ds.column("Value").data, [10,20,30,1,4,7]));
        start();
      }
    });
  });

  test("more columns than rows in Google Spreadsheet", function() {
    var ds = new Miso.Dataset({
      key : "0AgzGUzeWla8QdDZLZnVieS1pOU5VRGxJNERvZ000SUE",
      worksheet : "1",
      importer: Miso.Importers.GoogleSpreadsheet,
      parser : Miso.Parsers.GoogleSpreadsheet
    });
    ds.fetch({
      success : function() {
        ok(this._columns.length === 5);
        var ds = this;
        var row = {'_id': this.rowByPosition(0)._id, 'one': 1, 'two': 2, 'three': 9, 'four': 9};

        _.each(row, function(v,k) {
          equals(ds.rowByPosition(0)[k], v);
        });
        start();
      },
      error : function() {
      }
    });
    stop();
  });

  test("more columns than rows in Google Spreadsheet fast parse", function() {
    var ds = new Miso.Dataset({
      key : "0AgzGUzeWla8QdDZLZnVieS1pOU5VRGxJNERvZ000SUE",
      worksheet : "1",
      fast : true,
      importer: Miso.Importers.GoogleSpreadsheet,
      parser : Miso.Parsers.GoogleSpreadsheet
    });
    ds.fetch({
      success : function() {
        ok(this._columns.length === 5);
        var ds = this;
        var row = {'_id': this.rowByPosition(0)._id, 'one': 1, 'two': 2, 'three': 9, 'four': 9};

        _.each(row, function(v,k) {
          equals(ds.rowByPosition(0)[k], v);
        });
        start();
      },
      error : function() {
      }
    });
    stop();
  });

  module("Polling");
  test("Basic polling importer api", function() {

    stop();
    var reqs = 5, madereqs = 0;
    expect(reqs);

    var importer = new Miso.Importers.Polling({
      url : "/poller/non_overlapping/5.json",
      interval : 100
    });

    // {
    //   id: 11
    //   key: "11_key"
    //   value: "11_value"
    // }

    var initId = null;
    importer.fetch({
      success: function(data) {

        // if we're done querying, stop the polling.
        if (madereqs === reqs) {
          importer.stop();
          ok(data[0].id === (initId + (madereqs * 10) ), data[0].id + "," + (initId + (madereqs * 10)));
          start();
        } else if (madereqs === 0) {
          initId = data[0].id;
        } else {
          ok(data[0].id === (initId + (madereqs * 10) ), data[0].id + "," + (initId + (madereqs * 10)));
        }
        
        madereqs++;
        
      },
      error : function(error) {
        console.log(error);
      }
    });
  });

  test("Basic polling non overlapping through dataset api", function() {

    stop();
    expect(18);

    var startId = Math.floor(Math.random() * 100);
    var reqs = 6, madereqs = 1, expectedSize = reqs * 10;

    var ds = new Miso.Dataset({
      url : "/poller/non_overlapping/" + startId + ".json",
      interval : 300
    });

    ds.fetch({ 
      success : function() {  

        // done
        if (madereqs === reqs) {
          ds.importer.stop();

          // check that the length is correct
          equals(ds.length, expectedSize);
          equals(ds._columns.length, 4);
          ds.eachColumn(function(cn, c) {
            equals(c.data.length, expectedSize);
          });

          // check data size
          ds.eachColumn(function(cn, c, i) {
            equals(c.data.length, expectedSize);
          });

          // check values
          equals(ds._columns[1].data[0], startId + "_key");
          equals(ds._columns[2].data[0], startId + "_value");
          equals(ds._columns[3].data[0], startId);

          equals(ds._columns[1].data[expectedSize-1], (startId + expectedSize-1) + "_key");
          equals(ds._columns[2].data[expectedSize-1], (startId + expectedSize-1) + "_value");
          equals(ds._columns[3].data[expectedSize-1], (startId + expectedSize-1));

          // check cache sizes
          var cachedRowids = _.map(
            _.keys(ds._rowPositionById), 
            function(i) { 
              return +i;
            }
          );

          ok(_.isEqual(ds._columnPositionByName, { _id : 0, id : 3 , key : 1, value : 2 }));
          equals(ds._rowIdByPosition.length, expectedSize);
          
          ok(_.isEqual(_.values(ds._rowIdByPosition), cachedRowids));
          ok(_.isEqual(cachedRowids, ds._columns[0].data));
          
          start();
        } else {
          madereqs++;
        }
      
      }, 
      error : function(r) { 
        console.log(r); 
      }
    });
  });

  test("Polling with unique constraint", function() {
    stop();
    expect(11);

    var startId = Math.floor(Math.random() * 100);
    var reqs = 6, madereqs = 1, expectedSize = 10 + ((reqs-2) * 5);

    var ds = new Miso.Dataset({
      url : "/poller/overlapping/" + startId + "/5.json",
      interval : 300,
      uniqueAgainst : "key"
    });

    ds.fetch({ 
      success : function() {  

        // done
        if (madereqs === reqs) {
          ds.importer.stop();
          
          // check dataset length
          equals(ds.length, expectedSize);
          ds.eachColumn(function(cn, c) {
            equals(c.data.length, expectedSize);
          });

          // check the actual data content
          var keycol = [], valcol = [], idscol = [];
          for(var i = 0; i < expectedSize; i++) {
            idscol.push(startId + i);
            keycol.push((startId + i) + "_key");
            valcol.push((startId + i) + "_value");
          }
          ok(_.isEqual(idscol, this.column("id").data));
          ok(_.isEqual(keycol, this.column("key").data));
          ok(_.isEqual(valcol, this.column("value").data));
          
           // check cache sizes
          var cachedRowids = _.map(
            _.keys(ds._rowPositionById), 
            function(i) { 
              return +i;
            }
          );

          ok(_.isEqual(ds._columnPositionByName, { _id : 0, id : 3 , key : 1, value : 2 }));
          equals(ds._rowIdByPosition.length, expectedSize);
          
          ok(_.isEqual(_.values(ds._rowIdByPosition), cachedRowids));
          ok(_.isEqual(cachedRowids, ds._columns[0].data));

          start();
        } else {
          madereqs++;
        }
      
      }, 
      error : function(r) { 
        console.log(r); 
      }
    });
  });

  test("Polling with reset on Fetch", function() {
    stop();
    

    var startId = Math.floor(Math.random() * 100);
    var reqs = 6, madereqs = 1, expectedSize = 10;

    var ds = new Miso.Dataset({
      url : "/poller/overlapping/" + startId + "/5.json",
      interval : 300,
      resetOnFetch : true
    });

    ds.fetch({
      success: function() {

        // done
        if (madereqs === reqs) {
          ds.importer.stop();
          // check dataset length
          equals(ds.length, expectedSize);
          ds.eachColumn(function(cn, c) {
            equals(c.data.length, expectedSize);
          });

          // check the actual data content
          var keycol = [], valcol = [], idscol = [];
          for(var i = 0; i < expectedSize; i++) {
            var _i = startId + ((reqs - 4) * 10) + i;
            idscol.push(_i);
            keycol.push(_i + "_key");
            valcol.push(_i + "_value");
          }
          
          ok(_.isEqual(idscol, this.column("id").data));
          ok(_.isEqual(keycol, this.column("key").data));
          ok(_.isEqual(valcol, this.column("value").data));
          
           // check cache sizes
          var cachedRowids = _.map(
            _.keys(ds._rowPositionById), 
            function(i) { 
              return +i;
            }
          );

          ok(_.isEqual(ds._columnPositionByName, { _id : 0, id : 3 , key : 1, value : 2 }));
          equals(ds._rowIdByPosition.length, expectedSize);
          
          ok(_.isEqual(_.values(ds._rowIdByPosition), cachedRowids));
          ok(_.isEqual(cachedRowids, ds._columns[0].data));
          start();
        } else {
          madereqs++;
        }
      }
    });
  });

}(this));

