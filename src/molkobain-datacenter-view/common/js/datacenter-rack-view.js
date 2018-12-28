/*
 * Copyright (c) 2015 - 2019 Molkobain.
 *
 * This file is part of licensed extension.
 *
 * Use of this extension is bound by the license you purchased. A license grants you a non-exclusive and non-transferable right to use and incorporate the item in your personal or commercial projects. There are several licenses available (see https://www.molkobain.com/usage-licenses/ for more informations)
 */

;
$(function()
{
	$.widget('molkobain.datacenter_rack_view', $.molkobain.datacenter_view,
		{
			options: {
				object_type: 'rack',
				defaults: {
					panel: 'front',
				},
			},

			// Constructor
			_create: function()
			{
				this._super();

				this.element.addClass('molkobain-datacenter-rack-view');
			},
			// Events bound via _bind are removed automatically
			// Revert other modifications here
			_destroy: function()
			{
				this.element.removeClass('molkobain-datacenter-rack-view');

				this._super();
			},
			// _setOptions is called with a hash of all options that are changing
			// Always refresh when changing options
			_setOptions: function()
			{
				this._superApply(arguments);
			},
			// _setOption is called for each individual option that is changing
			_setOption: function(key, value)
			{
				this._super(key, value);
			},

			// Initialize the widget
			// Inherited methods
			// - Make the markup for views (eg. rack panels, enclosure panel, ...)
			_initializeViews: function()
			{
				this._initializePanels();
			},
			// - Make the markup for unmounted elements to be displayed in
			_initializeUnmounted: function()
			{
				// Enclosures
				this._buildUnmountedContainer('enclosure');

				// Devices
				this._super();
			},
			// - Make the markup for elements (mounted or not) and display them where they belong
			_initializeElements: function()
			{
				this._initializeEnclosures();
				this._initializeDevices();
			},
			// Own methods
			// - Rack's panels, without elements
			_initializePanels: function()
			{
				for(var sPanelCode in this._getObjectDatum('panels'))
				{
					var oRackPanelElem = this._cloneTemplate('rack-panel')
						.attr('data-class', this._getObjectDatum('class'))
						.attr('data-id', this._getObjectDatum('id'))
						.attr('data-code', sPanelCode)
						.attr('data-name', this._getObjectDatum('name'))
						.appendTo(this.element.find('.mdv-views'));

					oRackPanelElem
						.find('.mdv-rp-title')
						.text(this._getObjectDatum('panels')[sPanelCode]);

					for(var iUnitsIdx = 1; iUnitsIdx <= this._getObjectDatum('nb_u'); iUnitsIdx++)
					{
						this._cloneTemplate('rack-unit')
	                        .attr('data-unit-number', iUnitsIdx)
	                        .find('.mdv-ru-left')
	                        .text(iUnitsIdx + 'U')
	                        .end()
	                        .prependTo( oRackPanelElem.find('.mdv-rpv-middle') );
					}
				}
			},
			// - Rack's enclosures
			_initializeEnclosures: function()
			{
				for(var sAssemblyType in this.enums.assembly_type)
				{
					for(var iEnclosureIdx in this._getObjectDatum('enclosures')[sAssemblyType])
					{
						var oEnclosure = this._getObjectDatum('enclosures')[sAssemblyType][iEnclosureIdx];
						var oEnclosureElem = this._cloneTemplate('enclosure')
							.attr('data-class', oEnclosure.class)
							.attr('data-id', oEnclosure.id)
							.attr('data-name', oEnclosure.name)
							.attr('data-rack-id', oEnclosure.rack_id)
							.attr('data-position-v', oEnclosure.position_v)
							.attr('data-position-p', oEnclosure.position_p);

						// Note: Url actually contains the hyperlink markup
						$('<div />')
							.addClass('mdv-element-note')
							.html(oEnclosure.url)
							.appendTo(oEnclosureElem);

						for(var iUnitsIdx = 1; iUnitsIdx <= oEnclosure.nb_u; iUnitsIdx++)
						{
							this._cloneTemplate('enclosure-unit')
							    .attr('data-unit-number', iUnitsIdx)
							    .prependTo(oEnclosureElem);
						}

						// Full height of n Us plus the bottom-border of n-1 Us
						oEnclosureElem
							.css('height', 'calc(' + (oEnclosure.nb_u * 20) + 'px + ' + (oEnclosure.nb_u - 1) + 'px)');

						var oHostElem;
						if( (sAssemblyType === this.enums.assembly_type.mounted) && (oEnclosure.position_v !== 0) )
						{
							oHostElem = this._getRackSlotElement(oEnclosure.position_v, oEnclosure.position_p);
						}
						else
						{
							oHostElem = this.element.find('.mdv-unmounted-type[data-type="enclosure"] .mhf-p-body');
						}
						oEnclosureElem.appendTo(oHostElem);

						// Put enclosures' elements
						for(var sEnclosureDevicesAssemblyType in this.enums.assembly_type)
						{
							for(var iDeviceIdx in oEnclosure.devices[sEnclosureDevicesAssemblyType])
							{
								var oDevice = oEnclosure.devices[sEnclosureDevicesAssemblyType][iDeviceIdx];
								var oDeviceHostElem = (sEnclosureDevicesAssemblyType === this.enums.assembly_type.mounted) ? this._getEnclosureSlotElement(oDevice.position_v, oEnclosure.id) : null;

								var oDeviceElem = this._initializeDevice(oDevice, oDeviceHostElem);
								if(oDeviceHostElem === null)
								{
									// Note: Url actually contains the hyperlink markup
									$('<div />')
										.addClass('mdv-element-note')
										.html('<i class="fa fa-link" aria-hidden="true"></i>' + oEnclosure.url)
										.appendTo(oDeviceElem);
								}
							}
						}

						// Tooltip
						// Note: We need to do a deep copy
						var oQTipOptions = $.extend(
							true,
							{},
							{ content: oEnclosure.tooltip.content },
							this.options.defaults.tooltip_options
						);
						oQTipOptions.position.adjust.x = -15;
						oEnclosureElem.find('.mdv-element-note').qtip(oQTipOptions);
					}
				}

				return oEnclosureElem;
			},
			// - Rack's devices
			_initializeDevices: function()
			{
				for(var sAssemblyType in this.enums.assembly_type)
				{
					for(var iDeviceIdx in this._getObjectDatum('devices')[sAssemblyType])
					{
						var oDevice = this._getObjectDatum('devices')[sAssemblyType][iDeviceIdx];
						this._initializeDevice(oDevice);
					}
				}
			},
			_initializeDevice: function(oDevice, oHostElem)
			{
				if((oHostElem === false) || (oHostElem === undefined) || (oHostElem === null))
				{
					oHostElem = this._getRackSlotElement(oDevice.position_v, oDevice.position_p);
					if(oHostElem === false)
					{
						oHostElem = this.element.find('.mdv-unmounted-type[data-type="device"] .mhf-p-body')
					}
				}

				var oDeviceElem = this._cloneTemplate('device')
				                      .attr('data-class', oDevice.class)
				                      .attr('data-id', oDevice.id)
				                      .attr('data-name', oDevice.name)
				                      .attr('data-rack-id', oDevice.rack_id)
				                      .attr('data-enclosure-id', oDevice.enclosure_id)
				                      .attr('data-position-v', oDevice.position_v)
				                      .attr('data-position-p', oDevice.position_p);

				// Note: Url actually contains the hyperlink markup
				oDeviceElem
					.find('.mdv-d-name')
					.html(oDevice.url);

				// Dynamic height to occupy desired Us
				oDeviceElem
					.css('height', 'calc(' + (oDevice.nb_u * 20) + 'px + ' + (oDevice.nb_u - 1) + 'px)');

				// Tooltip
				// Note: We need to do a deep copy
				var oQTipOptions = $.extend(
					true,
					{},
					{ content: oDevice.tooltip.content },
					this.options.defaults.tooltip_options
				);
				// Note: We don't use the .closest() yet for performance reasons. If this goes recurse, we might want to consider it though.
				if(oHostElem.closest('.mdv-unmounted-type').length > 0)
				{
					oQTipOptions.position.adjust.x = -15;
				}
				oDeviceElem.qtip(oQTipOptions);

				oDeviceElem.appendTo(oHostElem);

				return oDeviceElem;
			},

			// Getters
			_getRackSlotElement: function(iSlotNumber, sPanelCode)
			{
				if(sPanelCode === undefined)
				{
					sPanelCode = this.options.defaults.panel;
				}

				var oSlotElem = this.element.find('.mdv-rack-panel[data-code="' + sPanelCode + '"] .mdv-rack-unit[data-unit-number="' + iSlotNumber + '"] .mdv-ru-slot');
				if(oSlotElem.length === 0)
				{
					this._trace('Could not find rack slot "' + iSlotNumber + 'U" for panel "' + sPanelCode + '".');
					return false;
				}

				return oSlotElem;
			},
			_getEnclosureSlotElement: function(iSlotNumber, iEnclosureId)
			{
				var oSlotElem = this.element.find('.mdv-enclosure[data-id="' + iEnclosureId + '"] .mdv-enclosure-unit[data-unit-number="' + iSlotNumber + '"] .mdv-eu-slot');
				if(oSlotElem.length === 0)
				{
					this._trace('Could not find enclosure slot "' + iSlotNumber + 'U" for "' + iEnclosureId + '".');
					return false;
				}

				return oSlotElem;
			}

			// Helpers
		}
	);
});