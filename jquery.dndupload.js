/**
 *
 * jQuery plugin:HTML5 Drag and drop uploader
 *
 * Author:liu you<you.liu@gmail.com>
 *
 * Licensed under the MIT license:
 *   http://www.opensource.org/licenses/mit-license.php
 *
 * Project home:
 *   http://www.github.com/dropping/jquery-dndupload
 *
 * Version:  1.0
 *
 * Features:
 *     1. if browser supports FormData, use FormData to upload (Chrome 6+, Firefox 4+, IE 10);
 *     2. else use InMemory upload(Firefox 3.6+, IE9).
 *     3. Supports multiply files.
 *     4. Allows send extra parameters with file.
 *     5. Allows cancel some file to upload or cancelAll.
 *     6. Supports multiply upload container.
 *
 * Usage:
 *      $("#file-list").dndupload({
 *          params:{
 *              param1 : 'value1'
 *          },
 *          url:'/api/upload',
 *          maxfiles:100,
 *          maxfilesize:50*1024*1024
 *      }).bind("over.dndupload", function(event){
 *          $(this).addClass("dnd-enter");
 *      }).bind("out.dndupload", function(event){
 *          $(this).removeClass("dnd-enter");
 *      }).bind("done.dndupload", function(event, data){
 *          //show result
 *          console.info(data.result);
 *          $(this).removeClass("dnd-enter");
 *      });
 */
(function ($) {
    $.event.props.push("dataTransfer");
    function FileInfo(fieldname, filename, filedata, mimetype) {
        this.fieldname = fieldname;
        this.filename = filename;
        this.filedata = filedata;
        this.mimetype = mimetype;
    }

    var isFormDataEnable = window.FormData && $.isFunction(window.FormData);

    function packageData(fileinfo, params, boundary) {
        var dashdash = '--', crlf = '\r\n', data = [];
        $.map(params, function (value, name) {
            data.push(dashdash, boundary, crlf);
            data.push('Content-Disposition: form-data; name="' + name + '"', crlf, crlf)
            data.push(value, crlf);
        });
        data.push(dashdash, boundary, crlf);
        data.push('Content-Disposition: form-data; name="' + fileinfo.fieldname
            + '"; filename="' + unescape(encodeURIComponent(fileinfo.filename)) + '"', crlf);
        data.push('Content-Type: ' + fileinfo.mimetype, crlf, crlf);
        data.push(fileinfo.filedata, crlf);
        data.push(dashdash, boundary, dashdash, crlf);
        return data.join('');
    }

    function packageFormData(fileinfo, params) {
        var data = new FormData();
        data.append(fileinfo.fieldname, fileinfo.filedata);
        data.append("filename", fileinfo.filename);
        $.map(params, function (value, name) {
            data.append(name, value);
        });
        return data;
    }

    var _triggerEvent = function (dndupload, eventname, data) {
        dndupload.$element.trigger(eventname, $.extend({}, data, {dndupload:dndupload}));
    };
    var DndUpload = function (element, options) {
        this.$element = $(element);
        this.options = $.extend({}, $.fn.dndupload.defaults, options);
        this.files = [];
        this.listen();
        this.enable = true;
    };
    DndUpload.prototype = {
        listen:function () {
            this.$element
                .on('drop', $.proxy(this.drop, this))
                .on('dragenter', $.proxy(this.dragenter, this))
                .on('dragover', $.proxy(this.dragover, this))
                .on('dragleave', $.proxy(this.dragleave, this));
            $(document).on('drop.dndupload dragover.dndupload dragenter.dndupload dragleave.dndupload', function (event) {
                return false;
            });
        },
        drop:function (event) {
            if (!this.enable)return;
            _triggerEvent(this, "dropit.dndupload", {});
            if (!event.dataTransfer || !event.dataTransfer.files) {
                _triggerEvent(this, "error.dndupload", {error:$.fn.dndupload.errors[0]});
                return false;
            }
            var files = event.dataTransfer.files;
            if (files.length > this.options.maxfiles) {
                _triggerEvent(this, "error.dndupload", {error:$.fn.dndupload.errors[1]});
                return false;
            }
            if (files.length > 0) {
                this.upload(files);
            }
            event.preventDefault();
            return false;
        },
        dragenter:function (event) {
            if (!this.enable)return;
            _triggerEvent(this, "enter.dndupload", {});
            event.preventDefault();
            return false;
        },
        dragover:function (event) {
            if (!this.enable)return;
            _triggerEvent(this, "over.dndupload", {});
            event.preventDefault();
            return false;
        },
        dragleave:function (event) {
            if (!this.enable)return;
            _triggerEvent(this, "out.dndupload", {});
            event.preventDefault();
            event.stopPropagation();
            return false;
        },
        upload:function (files) {
            if (!this.enable)return;
            var self = this;
            this.enable = false;
            this.files = [];
            this.result = {success:[], fail:[], cancel:[]};
            $.each(files, function (index, item) {
                item.id = index;
                self.files.push(item);
                if (item.size > self.options.maxfilesize) {
                    item.error = true;
                    return;
                }
            });
            _triggerEvent(this, "start.dndupload", {files:this.files});
            this.uploadNext();
        },
        uploadNext:function () {
            if (this.files.length <= 0) {
                return this.done();
            }
            var file = this.files.shift(), reader = new FileReader();
            if (file.error) {
                return this.uploadNext();
            }
            reader.file = this.file = file;
            if (isFormDataEnable) {
                this.readEnd();
            } else {
                reader.onloadend = $.proxy(this.readEnd, this);
                reader.readAsBinaryString(file);
            }
        },
        uploadProgress:function (event) {
            if (!event.lengthComputable)return;
            _triggerEvent(this, "uploadprogress.dndupload", {file:this.file, event:event, progress:Math.floor((event.loaded / event.total) * 100)});
        },
        uploadComplete:function (event) {
            _triggerEvent(this, "uploadcomplete.dndupload", {file:this.file, event:event});
            this.result.success.push(this.file);
            this.uploadNext();
        },
        uploadError:function (event) {
            _triggerEvent(this, "uploaderror.dndupload", {file:this.file, event:event});
            this.result.fail.push(this.file);
            this.uploadNext();
        },
        uploadStart:function (event) {
            _triggerEvent(this, "uploadstart.dndupload", {file:this.file});
        },
        done:function () {
            _triggerEvent(this, "done.dndupload", {result:this.result});
            this.enable = true;
        },
        readEnd:function (event) {
            var file = this.file, xhr = new XMLHttpRequest(), upload = xhr.upload,
                boundary = 'dndupload', binaryData, formData,
                fileInfo = new FileInfo(this.options.fieldname, file.name, event ? event.target.result : file, file.type);
            this.xhr = xhr;
            upload.addEventListener("progress", $.proxy(this.uploadProgress, this), false);
            upload.addEventListener("load", $.proxy(this.uploadComplete, this), false);
            upload.addEventListener("error", $.proxy(this.uploadError, this), false);
            xhr.open("POST", this.options.url, true);
            xhr.setRequestHeader("Cache-Control", "no-cache");
            xhr.setRequestHeader("X-Requested-With", "XMLHttpRequest");
            xhr.setRequestHeader("X-File-Name", file.name);
            $.each(this.options.headers, function (k, v) {
                xhr.setRequestHeader(k, v);
            });
            if (isFormDataEnable) {
                formData = packageFormData(fileInfo, this.options.params);
                xhr.send(formData);
            } else {
                xhr.setRequestHeader('Content-Type', 'multipart/form-data; boundary=' + boundary);
                binaryData = packageData(fileInfo, this.options.params, boundary);
                xhr.sendAsBinary(binaryData);
            }
        },
        cancelAll:function () {
            var files = this.files, self = this;
            this.files = [];
            this.xhr.abort();
            files.unshift(this.file);
            $.each(files, function (index, item) {
                _triggerEvent(self, "uploadcancel.dndupload", {file:item});
                self.result.cancel.push(this.file);
            });
            files = null;
            this.file = null;
            this.xhr = null;
            this.done();
        },
        removeFile:function (fileId) {
            if (this.file.id == fileId) {
                this.xhr.abort();
                _triggerEvent(this, "uploadcancel.dndupload", {file:this.file});
                this.result.cancel.push(this.file);
                this.file = null;
                this.xhr = null;
                this.uploadNext();
                return;
            }
            var files = [], file;
            $.each(this.files, function (index, item) {
                if (item.id != fileId) {
                    files.push(item);
                } else {
                    file = item;
                }
            });
            if (file != null) {
                _triggerEvent(this, "uploadcancel.dndupload", {file:file});
                this.result.cancel.push(file);
            }
            this.files = files;
        }
    };
    $.fn.dndupload = function (option) {
        return this.each(function () {
            var $this = $(this)
                , data = $this.data('dndupload')
                , options = typeof option == 'object' && option;
            if (!data) $this.data('dndupload', (data = new DndUpload(this, options)));
            if (typeof option == 'string') data[option]();
        })
    };
    $.fn.dndupload.errors = ["BrowserNotSupported", "TooManyFiles"];
    $.fn.dndupload.defaults = {
        url:'',
        headers:{},
        params:{},
        fieldname:"filedata",
        maxfiles:25,
        maxfilesize:1 * 1024 * 1024
    }
    $.fn.dndupload.Constructor = DndUpload;
    (function () {
        if (XMLHttpRequest.prototype.sendAsBinary) return;
        XMLHttpRequest.prototype.sendAsBinary = function (datastr) {
            function byteValue(x) {
                return x.charCodeAt(0) & 0xff;
            }

            var ords = Array.prototype.map.call(datastr, byteValue);
            var ui8a = new Uint8Array(ords);
            this.send(ui8a.buffer);
        }
    })();

})(jQuery);
