; (function ($, window, document, undefined) {
    "use strict";

    var pluginName = "ctshop",
        defaults = {
            cart: 'ct-cart',
            product: 'ct-product',
            product_title: 'ct-product-title',
            product_price: 'ct-product-price',
            product_button: 'ct-product-button',
            product_image: false,
            product_wishlist: 'ct-product-wishlist',
            wishlist: 'ct-wishlist',
            currency: '$',
            currency_after_number: 'false',
            permanent_cart_buttons: 'false',
            display_total_value: 'true',
            permanent_total_value: 'false',
            animation: 'fadeIn',
            empty_disable: 'false',
            empty_text: 'Your cart is empty',
            paypal: {
                business: "office@createit.pl",
                currency_code: "USD",
                lc: 'EN',
                cpp_cart_border_color: '',
                cpp_payflow_color: '',
                no_note: '0',
                no_shipping: '0',
                return: '',
                cancel_return: ''
            },
            init: false,                      // fires before first initialization
            before_add_to_cart: false,        // fires before append to cart happen
            after_add_to_cart: false,         // fires after append to cart happen
            remove_item_from_cart: false,     // fires after remove button in cart
            before_checkout: false,           // fires before redirecting to paypal
            after_clear_cart: false,          // fires after clearing the cart
            after_value_changes: false,       // fires when total value changes
            before_add_to_wishlist: false,    // fires before append to wishlist happen
            after_add_to_wishlist: false,     // fires after append to wishlist happen
            remove_item_from_wishlist: false  // fires after remove button in wishlist
        };





    /* Plugin Constructor */
    function Plugin(element, options) {
        this.element = $(element);
        this.settings = $.extend(true, {}, defaults, options);

        this.cart = this.element.find('.' + this.settings.cart);
        this.wishlist = this.element.find('.' + this.settings.wishlist)
        this.product = this.element.find('.' + this.settings.product);

        this._defaults = defaults;
        this._name = pluginName;

        this.init();
    }





    /* Avoid Prototype Conficts */
    $.extend(Plugin.prototype, {
        init: function () {
            var self = this;


            /* Append <ul> to Cart */
            self.cart = self.cart.append('<ol/>').find('ol');

            if (self.settings.wishlist)
                self.wishlist = self.wishlist.append('<ol/>').find('ol');

            if (window.sessionStorage['ct-shopping-wishlist']) {

                var $wish_li_length = self.wishlist.find('li').length;

                self.create_storage_wish();
                self.remove_item($wish_li_length, true);
            }


            /* Append Permanent */
            self.permanent_total();
            self.permanent_cart_buttons();


            /* Check Storage */
            if (window.sessionStorage['ct-shopping-cart']) {

                self.create_storage_cart();

                var $cart_li = self.cart.find('li'),
                    $cart_li_input = $cart_li.find('.' + self.settings.cart + '-input'),
                    $cart_li_length = $cart_li.length;

                if (self.settings.permanent_cart_buttons === 'false') {
                    self.add_cart_buttons();
                }
                if (self.settings.display_total_value === 'true' && self.settings.permanent_total_value === 'false') {
                    self.append_total();
                }
                self.calculate_total_value();
                self.quantity_change($cart_li_input)
                self.remove_item($cart_li_length);
            }


            /* Init Callback */
            if (self.settings.init) {
                self.settings.init();
            }


            /* Check if empty */
            self.cart_empty();



            /* Each Product Function */
            self.product.each(function (num) {
                var that = $(this),
                    $product_image = self.absolute_url() + that.find('.' + self.settings.product_image).attr('src'),
                    $product_title = that.find('.' + self.settings.product_title),
                    $product_price = that.find('.' + self.settings.product_price),
                    $product_button = that.find('.' + self.settings.product_button),
                    $product_title_value = $product_title.text(),
                    $product_price_value = $product_price.text().replace(',', '').replace(/[^\d.]/g, '');

                if (self.settings.wishlist) {

                    var $product_wishlist = that.find('.' + self.settings.product_wishlist);



                    /* Wishlist Button */
                    $product_wishlist.on('click touchend', function (e) {
                        e.preventDefault();

                        if (self.settings.before_add_to_wishlist)
                            self.settings.before_add_to_wishlist();

                        $product_title_value = self.check_if_title($product_title, $product_title_value);
                        $product_price_value = self.check_if_price($product_price, $product_price_value);

                        var $product_attribute = that.attr('data-id',
                            $product_title_value.replace(/ /g, "")
                                .replace(/\r\n|\r|\n/g, "")
                                .replace(/[^a-zA-Z 0-9]+/g, '') + $product_price_value
                                    .replace(/\r\n|\r|\n/g, "")
                                    .replace(/[^a-zA-Z 0-9]+/g, '') + '_' + (num + 1))
                            .attr('data-id'),
                            $wish_li = self.wishlist.find('li'),
                            $wish_li_current = self.wishlist.find('[data-id=' + $product_attribute + ']'),
                            $wish_li_attribute = $wish_li_current.attr('data-id'),
                            $wish_li_length,
                            $cart_li_current = self.cart.find('[data-id=' + $product_attribute + ']');


                        /* Append Item Conditional */
                        if ((!$cart_li_current.length) && ($wish_li.length !== 0) && ($wish_li_attribute !== $product_attribute)) {
                            self.add_to_wishlist($product_title_value, $product_price_value, $product_attribute, $product_image);
                        } else if (($wish_li.length === 0) && (!$cart_li_current.length)) {
                            self.add_to_wishlist($product_title_value, $product_price_value, $product_attribute, $product_image);
                        }


                        /* Updated Local Variables */
                        $wish_li = self.wishlist.find('li');
                        $wish_li_length = $wish_li.length;


                        /* Functions */
                        self.remove_item($wish_li_length, true);


                        if (self.settings.after_add_to_wishlist)
                            self.settings.after_add_to_wishlist();

                        return false;
                    });

                }


                /* Add to Cart Click Event */
                $product_button.on('click touchend', function (e) {
                    e.preventDefault();


                    /* Before Add to Cart Callback */
                    if (self.settings.before_add_to_cart) {
                        self.settings.before_add_to_cart();
                    }

                    $product_title_value = self.check_if_title($product_title, $product_title_value);
                    $product_price_value = self.check_if_price($product_price, $product_price_value);

                    var $product_attribute = that.attr('data-id',
                        $product_title_value.replace(/ /g, "")
                            .replace(/\r\n|\r|\n/g, "")
                            .replace(/[^a-zA-Z 0-9]+/g, '') + $product_price_value
                                .replace(/\r\n|\r|\n/g, "")
                                .replace(/[^a-zA-Z 0-9]+/g, '') + '_' + (num + 1))
                        .attr('data-id');


                    /* Cart Local Variabls */
                    var $cart_li = self.cart.find('li'),
                        $cart_li_current = self.cart.find('[data-id=' + $product_attribute + ']'),
                        $cart_li_attribute = $cart_li_current.attr('data-id'),
                        $cart_li_input = $cart_li.find('.' + self.settings.cart + '-input'),
                        $cart_li_length;


                    /* Append Item Conditional */
                    if ($cart_li.length !== 0) {
                        if ($cart_li_attribute !== $product_attribute) {
                            self.add_to_cart($product_title_value, $product_price_value, $product_attribute, $product_image);
                        } else {
                            $cart_li_current.find('input').val(function (i, old_val) {
                                return parseInt(old_val, 10) + 1;
                            })
                        }
                    } else {
                        self.add_to_cart($product_title_value, $product_price_value, $product_attribute, $product_image);
                        if (self.settings.permanent_cart_buttons === 'false') {
                            self.add_cart_buttons();
                        }
                        if (self.settings.display_total_value === 'true' && self.settings.permanent_total_value === 'false') {
                            self.append_total();
                        }
                    }

                    if (self.settings.wishlist) {
                        $('.' + self.settings.wishlist).find('[data-id=' + $product_attribute + ']').remove();
                    }


                    /* Updated Local Variables */
                    $cart_li = self.cart.find('li');
                    $cart_li_input = $cart_li.find('.' + self.settings.cart + '-input');
                    $cart_li_length = $cart_li.length;


                    /* Functions */
                    self.quantity_change($cart_li_input)
                    self.calculate_total_value();
                    self.remove_item($cart_li_length);


                    /* After Add to Cart Callback */
                    if (self.settings.after_add_to_cart) {
                        self.settings.after_add_to_cart();
                    }
                    return false;
                });

            });

        },




        /* Add To Wishlist */
        add_to_wishlist: function (name, price, attr, image_src) {
            var self = this;

            if (self.settings.product_image) {
                if (self.settings.currency_after_number === 'true') {
                    self.wishlist.append(
                        '<li class="animated ' + self.settings.animation + '" data-id=' + attr + '>' +
                            '<div class=' + self.settings.wishlist + '-left>' +
                                '<img src=' + image_src + ' /></div>' +
                            '<div class=' + self.settings.wishlist + '-body>' +
                                '<span class=' + self.settings.wishlist + '-name>' + name + '</span>' +
                                '<span class=' + self.settings.wishlist + '-price>' + price + self.settings.currency + '</span>' +
                                '<button class=' + self.settings.wishlist + '-remove>&times;</button>' +
                                '<button class=' + self.settings.wishlist + '-add-to-cart>Add To Cart</button>' +
                            '</div>' +
                        '</li>');
                } else {
                    self.wishlist.append(
                        '<li class="animated ' + self.settings.animation + '" data-id=' + attr + '>' +
                            '<div class=' + self.settings.wishlist + '-left>' +
                                '<img src=' + image_src + ' /></div>' +
                            '<div class=' + self.settings.wishlist + '-body>' +
                                '<span class=' + self.settings.wishlist + '-name>' + name + '</span>' +
                                '<span class=' + self.settings.wishlist + '-price>' + self.settings.currency + price + '</span>' +
                                '<button class=' + self.settings.wishlist + '-remove>&times;</button>' +
                                '<button class=' + self.settings.wishlist + '-add-to-cart>Add To Cart</button>' +
                            '</div>' +
                        '</li>');
                }
            } else {
                if (self.settings.currency_after_number === 'true') {
                    self.wishlist.append(
                        '<li class="animated ' + self.settings.animation + '" data-id=' + attr + '>' +
                        '<span class=' + self.settings.wishlist + '-name>' + name + '</span>' +
                        '<span class=' + self.settings.wishlist + '-price>' + price + self.settings.currency + '</span>' +
                        '<button class=' + self.settings.wishlist + '-remove>&times;</button>' +
                        '<button class=' + self.settings.wishlist + '-add-to-cart>Add To Cart</button>' +
                        '</li>');
                } else {
                    self.wishlist.append(
                        '<li class="animated ' + self.settings.animation + '" data-id=' + attr + '>' +
                        '<span class=' + self.settings.wishlist + '-name>' + name + '</span>' +
                        '<span class=' + self.settings.wishlist + '-price>' + self.settings.currency + price + '</span>' +
                        '<button class=' + self.settings.wishlist + '-remove>&times;</button>' +
                        '<button class=' + self.settings.wishlist + '-add-to-cart>Add To Cart</button>' +
                        '</li>');
                }
            }

            self.wishlist_add_to_cart();
            self.wish_storage_set();
        },





        /* Add Cart Item */
        add_to_cart: function (name, price, attr, image_src) {
            var self = this;

            if (self.settings.product_image) {
                if (self.settings.currency_after_number === 'true') {
                    self.cart.append(
                        '<li class="animated ' + self.settings.animation + '" data-id=' + attr + '>' +
                            '<div class=' + self.settings.cart + '-left>' +
                                '<img src=' + image_src + ' /></div>' +
                            '<div class=' + self.settings.cart + '-body>' +
                                '<span class=' + self.settings.cart + '-name>' + name + '</span>' +
                                '<span class=' + self.settings.cart + '-price>' + price + self.settings.currency + '</span>' +
                                '<input type="number" min="1" value="1" class=' + self.settings.cart + '-input>' +
                                '<button class=' + self.settings.cart + '-remove>&times;</button>' +
                            '</div>' +
                        '</li>');
                } else {
                    self.cart.append(
                        '<li class="animated ' + self.settings.animation + '" data-id=' + attr + '>' +
                            '<div class=' + self.settings.cart + '-left>' +
                                '<img src=' + image_src + ' /></div>' +
                            '<div class=' + self.settings.cart + '-body>' +
                                '<span class=' + self.settings.cart + '-name>' + name + '</span>' +
                                '<span class=' + self.settings.cart + '-price>' + self.settings.currency + price + '</span>' +
                                '<input type="number" min="1" value="1" class=' + self.settings.cart + '-input>' +
                                '<button class=' + self.settings.cart + '-remove>&times;</button>' +
                            '</div>' +
                        '</li>');
                }
            } else {
                if (self.settings.currency_after_number === 'true') {
                    self.cart.append(
                        '<li class="animated ' + self.settings.animation + '" data-id=' + attr + '>' +
                        '<span class=' + self.settings.cart + '-name>' + name + '</span>' +
                        '<span class=' + self.settings.cart + '-price>' + price + self.settings.currency + '</span>' +
                        '<input type="number" min="1" value="1" class=' + self.settings.cart + '-input>' +
                        '<button class=' + self.settings.cart + '-remove>&times;</button>' +
                        '</li>');
                } else {
                    self.cart.append(
                        '<li class="animated ' + self.settings.animation + '" data-id=' + attr + '>' +
                        '<span class=' + self.settings.cart + '-name>' + name + '</span>' +
                        '<span class=' + self.settings.cart + '-price>' + self.settings.currency + price + '</span>' +
                        '<input type="number" min="1" value="1" class=' + self.settings.cart + '-input>' +
                        '<button class=' + self.settings.cart + '-remove>&times;</button>' +
                        '</li>');
                }
            }


        },





        /* Add Cart Buttons */
        add_cart_buttons: function () {
            var self = this;
            self.cart.parent().append('<button class="btn btn-default btn-block" id="clearCartBtn">Clear Cart</button>');
            self.cart.parent().append('<button type="submit" class="btn btn-success btn-block" id="checkOutBtn">Proceed to Checkout</button>');

            self.clear_cart();
            self.checkout_button();
        },





        /* Paypal checkout function */
        checkout: function () {
            var self = this,
                pp_config = {
                    cmd: "_cart",
                    upload: 1
                },
                form = $('<form />'),
                temp,
                /* paypal variables */
                map = {
                    name: 'item_name',
                    quantity: 'quantity',
                    amount: 'amount'
                };

            $.extend(pp_config, self.settings.paypal);


            /* create form */
            form.attr('action', 'https://www.paypal.com/cgi-bin/webscr');
            form.attr('method', 'post');
            form.attr('target', '_blank');


            /* main paypal inputs */
            for (var config_item in pp_config) {
                temp = $('<input type="hidden" />');
                temp.attr('name', config_item);
                temp.attr('value', pp_config[config_item]);
                form.append(temp);
            }


            /* Paypal inputs for each item in cart */
            self.cart.find('li').each(function (i) {
                var that = $(this),
                    $name = that.find('.' + self.settings.cart + '-name').text(),
                    $price = parseFloat(that.find('.' + self.settings.cart + '-price').text().replace(/^\D+/g, '')),
                    $quantity = that.find('input').val(),
                    temp = {
                        name: $('<input />', { 'type': 'hidden', 'name': map.name + '_' + (i + 1), 'value': $name }),
                        amount: $('<input />', { 'type': 'hidden', 'name': map.amount + '_' + (i + 1), 'value': $price }),
                        quantity: $('<input />', { 'type': 'hidden', 'name': map.quantity + '_' + (i + 1), 'value': $quantity })
                    };
                form.append(temp.name).append(temp.amount).append(temp.quantity);
            });

            $('body').append(form);
            form.submit();
            form.remove();
        },





        /* Checkout Button Click Event */
        checkout_button: function () {
            var self = this;
            $(checkOutBtn).unbind().on('click', function () {

                /* Before Checkout Callback */
                if (self.settings.before_checkout) {
                    self.settings.before_checkout();
                }

                self.checkout();
            });
        },





        /* Remove Item from Cart */
        remove_item: function (element, is_wishlist) {
            var self = this,
                wishcart_settings = self.settings.cart,
                wishcart = self.cart;


            if (is_wishlist) {
                wishcart_settings = self.settings.wishlist;
                wishcart = self.wishlist;
            }



            $('.' + wishcart_settings + '-remove').unbind().on('click', function () {
                var that = $(this),
                    $length = wishcart.find('li').length;

                that.closest('li').remove();

                if (!is_wishlist) {

                    self.calculate_total_value();

                    self.storage_set();

                    if ($length === 1) {
                        self.remove_cart_buttons();
                        self.remove_total(self.total);
                        self.storage_clear();
                    }

                    /* Remove Item From Cart Callback */
                    if (self.settings.remove_item_from_cart) {
                        self.settings.remove_item_from_cart();
                    }
                } else {
                    self.wish_storage_set();

                    if ($length === 1)
                        self.wish_storage_clear();

                    if (self.settings.remove_item_from_wishlist) {
                        self.settings.remove_item_from_wishlist();
                    }
                }

            });
        },





        /* Clear Cart */
        clear_cart: function () {
            var self = this;
            $(clearCartBtn).on('click', function () {
                self.cart.find('li').each(function () {
                    $(this).remove();
                })
                self.remove_cart_buttons();
                self.remove_total(self.total);
                self.storage_clear();
                self.cart_empty();
                /* Clear Cart Callback */
                if (self.settings.after_clear_cart) {
                    self.settings.after_clear_cart();
                }
            })
        },





        /* Remove Cart Buttons */
        remove_cart_buttons: function () {
            var self = this;
            if (self.settings.permanent_cart_buttons === 'false') {
                self.cart.parent().find('button').remove();
            }
        },





        /* Check if something in title */
        check_if_title: function (title, value) {
            if (title.find('select').length !== 0) {
                if (title.find('span').length !== 0) {
                    value = title.find('span').text() + ' - ' + title.find('option:selected').val();
                } else {
                    value = title.find('option:selected').text();
                }
            } else if (title.find('input').length !== 0) {
                value = title.find('input').val();
            } else if (title.is(':empty')) {
                value = title.val()
            }
            return value;
        },





        /* Check if something in price */
        check_if_price: function (price, value) {
            if (price.find('select').length !== 0) {
                value = price.find('option:selected').val().replace(/^\D+/g, '');
            } else if (price.find('input').length !== 0) {
                value = price.find('input').val().replace(/^\D+/g, '');
            }
            return value;
        },





        /* Permanent cart buttons */
        permanent_cart_buttons: function () {
            var self = this;
            if (self.settings.permanent_cart_buttons === 'true') {
                self.add_cart_buttons();
            }
        },





        /* Calculate total value */
        calculate_total_value: function (element) {
            var self = this,
                result = 0,
                temp = 0;

            self.cart.find('li').each(function () {
                var price = parseFloat($(this).find('.' + self.settings.cart + '-price').text().replace(/^\D+/g, '')),
                    input = $(this).find('input').val();

                temp += (price * input);
                result = parseFloat(temp.toString()).toFixed(2);
            })
            if (self.settings.display_total_value === 'true') {
                if (self.settings.currency_after_number === 'true') {
                    self.total.html(result + self.settings.currency);
                } else {
                    self.total.html(self.settings.currency + result);
                }
            }

            self.cart_empty();


            /* After Value Changes Callback */
            if (self.settings.after_value_changes) {
                self.settings.after_value_changes();
            }

            self.storage_set();

            return result;
        },





        /* Quantity change */
        quantity_change: function (input, element) {
            var self = this;
            input.change(function () {
                self.calculate_total_value(element);

            })
        },





        /* Append total */
        append_total: function () {
            var self = this;
            self.total = self.cart.parent().prepend('<span class="' + self.settings.cart + '-total">').find('.' + self.settings.cart + '-total');
        },





        /* Remove total */
        remove_total: function (element) {
            var self = this;
            if (self.settings.display_total_value === 'true' && self.settings.permanent_total_value === 'false') {
                element.remove();
            } else if (self.settings.permanent_total_value === 'true' && self.settings.display_total_value === 'true') {
                self.calculate_total_value(element);
            }
        },





        /* Permanent total */
        permanent_total: function () {
            var self = this;
            if (self.settings.permanent_total_value === 'true' && self.settings.display_total_value === 'true') {
                self.append_total();
                if (self.settings.display_total_value === 'true') {
                    if (self.settings.currency_after_number === 'true') {
                        self.total.html('0' + self.settings.currency);
                    } else {
                        self.total.html(self.settings.currency + '0');
                    }
                }
            }
        },





        /* Session Storage Set */
        storage_set: function () {
            var self = this,
                cart_storage = {
                    items: []
                };

            $(self.cart).find('li').each(function () {
                var that = $(this),
                    $id = that.attr('data-id'),
                    $name = that.find('.' + self.settings.cart + '-name').text(),
                    $price = that.find('.' + self.settings.cart + '-price').text(),
                    $input = that.find('input').val(),
                    $image = that.find('img').attr('src'),
                    product = {
                        name: $name,
                        id: $id,
                        price: $price,
                        input: $input,
                        image: $image
                    };

                cart_storage.items.push(product);
            });
            window.sessionStorage.setItem('ct-shopping-cart', JSON.stringify(cart_storage))

        },





        /* Session Storage Get */
        storage_get: function () {
            var cart = window.sessionStorage['ct-shopping-cart'];
            cart = JSON.parse(cart);
            return cart;
        },





        /* Clear Session Storage */
        storage_clear: function () {
            window.sessionStorage.removeItem('ct-shopping-cart');
        },





        /* Session Storage Set */
        wish_storage_set: function () {
            var self = this,
                wish_storage = {
                    items: []
                };

            $(self.wishlist).find('li').each(function () {
                var that = $(this),
                    $id = that.attr('data-id'),
                    $name = that.find('.' + self.settings.wishlist + '-name').text(),
                    $price = that.find('.' + self.settings.wishlist + '-price').text(),
                    $image = that.find('img').attr('src'),
                    product = {
                        name: $name,
                        id: $id,
                        price: $price,
                        image: $image
                    };

                wish_storage.items.push(product);
            });
            window.sessionStorage.setItem('ct-shopping-wishlist', JSON.stringify(wish_storage))

        },





        /* Session Storage Get */
        wish_storage_get: function () {
            var wish = window.sessionStorage['ct-shopping-wishlist'];
            wish = JSON.parse(wish);
            return wish;
        },





        /* Clear Session Storage */
        wish_storage_clear: function () {
            window.sessionStorage.removeItem('ct-shopping-wishlist');
        },





        /* Create Storage wish */
        create_storage_wish: function () {
            var self = this,
                wish = self.wish_storage_get();


            for (var i = 0, len = wish.items.length; i < len; i++) {
                var $id = wish.items[i].id,
                    $name = wish.items[i].name,
                    $price = wish.items[i].price,
                    $image = wish.items[i].image;

                if (self.settings.product_image) {
                    self.wishlist.append(
                       '<li class="animated ' + self.settings.animation + '" data-id=' + $id + '>' +
                            '<div class=' + self.settings.wishlist + '-left>' +
                                '<img src=' + $image + ' /></div>' +
                            '<div class=' + self.settings.wishlist + '-body>' +
                                '<span class=' + self.settings.wishlist + '-name>' + $name + '</span>' +
                                '<span class=' + self.settings.wishlist + '-price>' + $price + '</span>' +
                                '<button class=' + self.settings.wishlist + '-remove>&times;</button>' +
                                '<button class=' + self.settings.wishlist + '-add-to-cart>Add To Cart</button>' +
                            '</div>' +
                        '</li>');
                } else {
                    self.wishlist.append(
                        '<li class="animated ' + self.settings.animation + '" data-id=' + $id + '>' +
                        '<span class=' + self.settings.wishlist + '-name>' + $name + '</span>' +
                        '<span class=' + self.settings.wishlist + '-price>' + $price + '</span>' +
                        '<button class=' + self.settings.wishlist + '-remove>x</button>' +
                        '<button class=' + self.settings.wishlist + '-add-to-cart>Add To Cart</button>' +
                        '</li>');
                }
            }
            self.wishlist_add_to_cart();
        },





        /* Create Storage Cart */
        create_storage_cart: function () {
            var self = this,
                cart = self.storage_get();


            for (var i = 0, len = cart.items.length; i < len; i++) {
                var $id = cart.items[i].id,
                    $name = cart.items[i].name,
                    $price = cart.items[i].price,
                    $image = cart.items[i].image,
                    $input = cart.items[i].input;

                if (self.settings.product_image) {
                    self.cart.append(
                        '<li class="animated ' + self.settings.animation + '" data-id=' + $id + '>' +
                            '<div class=' + self.settings.cart + '-left>' +
                                '<img src=' + $image + ' /></div>' +
                            '<div class=' + self.settings.cart + '-body>' +
                                '<span class=' + self.settings.cart + '-name>' + $name + '</span>' +
                                '<span class=' + self.settings.cart + '-price>' + $price + '</span>' +
                                '<input type="number" min="1" value="' + $input + '" class=' + self.settings.cart + '-input>' +
                                '<button class=' + self.settings.cart + '-remove>&times;</button>' +
                            '</div>' +
                        '</li>');
                } else {
                    self.cart.append(
                        '<li class="animated ' + self.settings.animation + '" data-id=' + $id + '>' +
                        '<span class=' + self.settings.cart + '-name>' + $name + '</span>' +
                        '<span class=' + self.settings.cart + '-price>' + $price + '</span>' +
                        '<input type="number" min="1" value="' + $input + '" class=' + self.settings.cart + '-input>' +
                        '<button class=' + self.settings.cart + '-remove>x</button>' +
                        '</li>');
                }
            }

        },





        /* Cart Empty */
        cart_empty: function () {
            var self = this,
                empty = self.settings.cart + '-empty';

            if (self.settings.empty_disable === 'false') {
                if (self.cart.find('li').length) {
                    $('.' + empty).remove();
                } else {
                    self.cart.parent().prepend('<span class="' + empty + '">' + self.settings.empty_text + '</span>')
                }
            }
        },




        /* Wishlist Add to Cart */
        wishlist_add_to_cart: function () {
            /* Cart Local Variabls */
            var self = this,
                $wish = self.wishlist.find('li');

            $wish.each(function () {
                var that = $(this),
                    $wish_add = that.find('.' + self.settings.wishlist + '-add-to-cart');

                $wish_add.on('click touchend', function (e) {
                    var $wish_attr = that.attr('data-id'),
                        $wish_title = that.find('.' + self.settings.wishlist + '-name').text(),
                        $wish_price = that.find('.' + self.settings.wishlist + '-price').text().replace(',', '').replace(/[^\d.]/g, ''),

                        $wish_image = that.find('img').attr('src'),
                        $cart_li = self.cart.find('li'),
                        $cart_li_current = self.cart.find('[data-id=' + $wish_attr + ']'),
                        $cart_li_attribute = $cart_li_current.attr('data-id'),
                        $cart_li_input = $cart_li.find('.' + self.settings.cart + '-input'),
                        $cart_li_length;


                    /* Append Item Conditional */
                    if ($cart_li.length !== 0) {
                        if ($cart_li_attribute !== $wish_attr) {
                            self.add_to_cart($wish_title, $wish_price, $wish_attr, $wish_image);
                        }
                    } else {
                        self.add_to_cart($wish_title, $wish_price, $wish_attr, $wish_image);
                        if (self.settings.permanent_cart_buttons === 'false') {
                            self.add_cart_buttons();
                        }
                        if (self.settings.display_total_value === 'true' && self.settings.permanent_total_value === 'false') {
                            self.append_total();
                        }
                    }

                    /* Updated Local Variables */
                    $cart_li = self.cart.find('li');
                    $cart_li_input = $cart_li.find('.' + self.settings.cart + '-input');
                    $cart_li_length = $cart_li.length;


                    /* Functions */
                    self.quantity_change($cart_li_input)
                    self.calculate_total_value();
                    self.remove_item($cart_li_length);

                    that.remove();
                    self.wish_storage_set();
                });
            })


        },



        /* Get Absolute URL */
        absolute_url: function () {
            var location = '',
                end_location = window.location.href.split('/');

            end_location.pop();

            location = end_location.join('/') + '/';

            return location;

        }

    });





    /* Plugin Init */
    $.fn[pluginName] = function (options) {
        return this.each(function () {
            if (!$.data(this, "plugin_" + pluginName)) {
                $.data(this, "plugin_" + pluginName, new Plugin(this, options));
            }
        });
    };





})(jQuery, window, document);
